import { Redis } from "@upstash/redis";
import {
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
  REDIS_OTP_TTL_SECONDS,
  AUTH_RATE_LIMIT_WINDOW_SECONDS,
  AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  REDIS_MENTOR_LOCK_TTL_SECONDS,
  REDIS_MENTOR_LOCK_RETRY_COUNT,
  REDIS_MENTOR_LOCK_RETRY_DELAY_MS,
} from "@/lib/config";

// Maximum time in milliseconds to wait for any Upstash Redis HTTP round-trip
const REDIS_NETWORK_TIMEOUT_MS = 350;

// Circuit Breaker: if Redis fails consecutively, stop calling it for 60 seconds
const CIRCUIT_BREAKER_RESET_MS = 60_000;
let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function isCircuitOpen(): boolean {
  if (circuitOpenUntil === 0) return false;
  if (Date.now() > circuitOpenUntil) {
    // Half-open: allow a single test probe
    circuitOpenUntil = 0;
    return false;
  }
  return true;
}

function recordSuccess(): void {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

function recordFailure(err?: unknown): void {
  consecutiveFailures++;
  if (consecutiveFailures >= 2) {
    circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
    console.warn(
      `[Redis CircuitBreaker] Tripped open for 60s due to consecutive failures. Using in-memory fallback.`,
      err ? `(${String((err as any)?.message || err)})` : ""
    );
  }
}

/**
 * Executes a Redis promise with an absolute timeout to prevent DNS/network hangs.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs = REDIS_NETWORK_TIMEOUT_MS): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`[Redis] Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    recordSuccess();
    return result;
  } catch (err) {
    recordFailure(err);
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// IN-MEMORY FALLBACK CACHE (Sub-millisecond local store when Redis is unavailable)
// ---------------------------------------------------------------------------

interface MemoryCacheEntry {
  value: unknown;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryCacheEntry>();
const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();
const memoryLocks = new Map<string, { token: string; expiresAt: number }>();

function cleanExpiredMemoryStore() {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt > 0 && entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Singleton Upstash Redis client.
 * Returns null if credentials are empty or improperly formatted.
 */
function createRedisClient(): Redis | null {
  const url = UPSTASH_REDIS_REST_URL?.trim();
  const token = UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token || !url.startsWith("http")) {
    return null;
  }

  try {
    return new Redis({
      url,
      token,
    });
  } catch (err) {
    console.warn("[Redis] Failed to initialize Upstash client:", err);
    return null;
  }
}

export const redis = createRedisClient();

/**
 * Checks if Upstash Redis client is configured and operational.
 */
export function isRedisAvailable(): boolean {
  return redis !== null && !isCircuitOpen();
}

/**
 * Safely fetches a cached JSON object.
 * Returns null on cache miss, missing client, or network failure (falls back to memory).
 */
export async function getCached<T>(key: string): Promise<T | null> {
  // Check in-memory store first
  const memoryEntry = memoryStore.get(key);
  if (memoryEntry) {
    if (memoryEntry.expiresAt === 0 || memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.value as T;
    }
    memoryStore.delete(key);
  }

  if (!redis || isCircuitOpen()) {
    return null;
  }

  try {
    const data = await withTimeout(redis.get<T>(key));
    if (data !== null && data !== undefined) {
      // Mirror to local memory for instant subsequent reads
      memoryStore.set(key, { value: data, expiresAt: Date.now() + 60_000 });
      return data;
    }
    return null;
  } catch (err) {
    return (memoryStore.get(key)?.value as T) ?? null;
  }
}

/**
 * Safely stores a JSON-serializable item in Redis with an optional TTL (in seconds).
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<boolean> {
  const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
  memoryStore.set(key, { value, expiresAt });

  if (memoryStore.size > 2000) {
    cleanExpiredMemoryStore();
  }

  if (!redis || isCircuitOpen()) {
    return true; // Stored safely in-memory
  }

  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await withTimeout(redis.set(key, value, { ex: ttlSeconds }));
    } else {
      await withTimeout(redis.set(key, value));
    }
    return true;
  } catch (err) {
    return true; // In-memory write succeeded
  }
}

/**
 * Safely invalidates one or more cache keys.
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  for (const k of keys) {
    memoryStore.delete(k);
  }

  if (!redis || isCircuitOpen() || keys.length === 0) return;

  try {
    await withTimeout(Promise.all(keys.map((k) => redis!.del(k))));
  } catch (err) {
    // In-memory already deleted
  }
}

// ---------------------------------------------------------------------------
// EPHEMERAL OTP MANAGEMENT
// ---------------------------------------------------------------------------

export interface StoredOtpData {
  otp: string;
  attempts: number;
  createdAt: number;
}

export type OtpVerificationResult =
  | { valid: true }
  | {
      valid: false;
      reason: "expired" | "invalid" | "too_many_attempts" | "not_found";
      attemptsRemaining?: number;
    };

function getOtpKey(email: string, purpose = "register"): string {
  return `otp:${purpose}:${email.toLowerCase().trim()}`;
}

/**
 * Stores an ephemeral OTP in Upstash (or in-memory) with automated TTL expiration.
 */
export async function storeRedisOtp(
  email: string,
  otp: string,
  purpose = "register",
  ttlSeconds = REDIS_OTP_TTL_SECONDS
): Promise<boolean> {
  const key = getOtpKey(email, purpose);
  const payload: StoredOtpData = {
    otp: otp.trim(),
    attempts: 0,
    createdAt: Date.now(),
  };

  // Always mirror in-memory
  memoryStore.set(key, { value: payload, expiresAt: Date.now() + ttlSeconds * 1000 });

  if (!redis || isCircuitOpen()) {
    return true;
  }

  try {
    await withTimeout(redis.set(key, payload, { ex: ttlSeconds }));
    return true;
  } catch (err) {
    return true; // Memory fallback succeeded
  }
}

/**
 * Verifies an ephemeral OTP against Redis or memory fallback.
 */
export async function verifyRedisOtp(
  email: string,
  otp: string,
  purpose = "register"
): Promise<OtpVerificationResult> {
  const key = getOtpKey(email, purpose);

  let data: StoredOtpData | null = null;

  if (redis && !isCircuitOpen()) {
    try {
      data = await withTimeout(redis.get<StoredOtpData>(key));
    } catch {
      data = null;
    }
  }

  if (!data) {
    const memoryEntry = memoryStore.get(key);
    if (memoryEntry && (memoryEntry.expiresAt === 0 || memoryEntry.expiresAt > Date.now())) {
      data = memoryEntry.value as StoredOtpData;
    }
  }

  if (!data || !data.otp) {
    return { valid: false, reason: "expired" };
  }

  if (data.otp !== otp.trim()) {
    const attempts = (data.attempts || 0) + 1;
    if (attempts >= 5) {
      memoryStore.delete(key);
      if (redis && !isCircuitOpen()) {
        try { await withTimeout(redis.del(key)); } catch {}
      }
      return { valid: false, reason: "too_many_attempts" };
    }

    const updated = { ...data, attempts };
    memoryStore.set(key, { value: updated, expiresAt: Date.now() + 300_000 });

    if (redis && !isCircuitOpen()) {
      try {
        const remainingTtl = await withTimeout(redis.ttl(key));
        const ttl = remainingTtl > 0 ? remainingTtl : 60;
        await withTimeout(redis.set(key, updated, { ex: ttl }));
      } catch {}
    }

    return {
      valid: false,
      reason: "invalid",
      attemptsRemaining: Math.max(0, 5 - attempts),
    };
  }

  // Code matched! Delete key immediately
  memoryStore.delete(key);
  if (redis && !isCircuitOpen()) {
    try { await withTimeout(redis.del(key)); } catch {}
  }
  return { valid: true };
}

/**
 * Deletes an active OTP key.
 */
export async function deleteRedisOtp(
  email: string,
  purpose = "register"
): Promise<void> {
  const key = getOtpKey(email, purpose);
  memoryStore.delete(key);
  if (!redis || isCircuitOpen()) return;
  try {
    await withTimeout(redis.del(key));
  } catch {}
}

// ---------------------------------------------------------------------------
// SUB-MILLISECOND RATE LIMITING
// ---------------------------------------------------------------------------

export async function checkRedisRateLimit(
  key: string,
  limit = AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  windowSeconds = AUTH_RATE_LIMIT_WINDOW_SECONDS
): Promise<boolean | null> {
  const redisKey = `ratelimit:${key.toLowerCase().trim()}`;
  const now = Date.now();

  // Handle in-memory rate limiting
  const mem = memoryRateLimits.get(redisKey);
  if (!mem || mem.resetAt <= now) {
    memoryRateLimits.set(redisKey, { count: 1, resetAt: now + windowSeconds * 1000 });
  } else {
    mem.count++;
    if (mem.count > limit) {
      return false;
    }
  }

  if (!redis || isCircuitOpen()) {
    return true;
  }

  try {
    const attempts = await withTimeout(redis.incr(redisKey));
    if (attempts === 1) {
      await withTimeout(redis.expire(redisKey, windowSeconds));
    }
    return attempts <= limit;
  } catch {
    // In-memory check already validated
    return true;
  }
}

export async function resetRedisRateLimit(key: string): Promise<void> {
  const redisKey = `ratelimit:${key.toLowerCase().trim()}`;
  memoryRateLimits.delete(redisKey);
  if (!redis || isCircuitOpen()) return;
  try {
    await withTimeout(redis.del(redisKey));
  } catch {}
}

// ---------------------------------------------------------------------------
// DISTRIBUTED MENTOR LOCK
// ---------------------------------------------------------------------------

function getMentorLockKey(mentorId: string): string {
  return `lock:mentor:request:${mentorId.trim()}`;
}

const RELEASE_LOCK_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export interface AcquireMentorLockOptions {
  ttlSeconds?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

export async function acquireMentorLock(
  mentorId: string,
  requesterId: string,
  options: AcquireMentorLockOptions = {}
): Promise<string | null> {
  const lockKey = getMentorLockKey(mentorId);
  const lockToken = `${requesterId}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
  const ttlSeconds = options.ttlSeconds ?? REDIS_MENTOR_LOCK_TTL_SECONDS;
  const now = Date.now();

  // In-memory lock fallback check
  const activeLock = memoryLocks.get(lockKey);
  if (activeLock && activeLock.expiresAt > now) {
    // Already locked locally
    return null;
  }
  memoryLocks.set(lockKey, { token: lockToken, expiresAt: now + ttlSeconds * 1000 });

  if (!redis || isCircuitOpen()) {
    return lockToken;
  }

  const maxRetries = options.retryCount ?? REDIS_MENTOR_LOCK_RETRY_COUNT;
  const retryDelayMs = options.retryDelayMs ?? REDIS_MENTOR_LOCK_RETRY_DELAY_MS;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const acquired = await withTimeout(
        redis.set(lockKey, lockToken, {
          nx: true,
          ex: ttlSeconds,
        })
      );

      if (acquired === "OK") {
        return lockToken;
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    } catch {
      // In case of timeout or connection error, rely on local in-memory lock
      return lockToken;
    }
  }

  return null;
}

export async function releaseMentorLock(
  mentorId: string,
  lockToken: string | null
): Promise<boolean> {
  if (!lockToken) return true;
  const lockKey = getMentorLockKey(mentorId);
  const activeLock = memoryLocks.get(lockKey);
  if (activeLock && activeLock.token === lockToken) {
    memoryLocks.delete(lockKey);
  }

  if (!redis || isCircuitOpen() || lockToken === "redis-bypass") {
    return true;
  }

  try {
    const result = await withTimeout(redis.eval(RELEASE_LOCK_LUA_SCRIPT, [lockKey], [lockToken]));
    return result === 1;
  } catch {
    return true;
  }
}
