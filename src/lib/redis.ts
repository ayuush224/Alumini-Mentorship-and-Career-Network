import { Redis } from "@upstash/redis";
import {
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
  REDIS_OTP_TTL_SECONDS,
  AUTH_RATE_LIMIT_WINDOW_SECONDS,
  AUTH_RATE_LIMIT_MAX_ATTEMPTS,
} from "@/lib/config";

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
  return redis !== null;
}

/**
 * Safely fetches a cached JSON object.
 * Returns null on cache miss, missing client, or network failure.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get<T>(key);
    return data ?? null;
  } catch (err) {
    console.warn(`[Redis] getCached error for key "${key}":`, err);
    return null;
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
  if (!redis) return false;
  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (err) {
    console.warn(`[Redis] setCached error for key "${key}":`, err);
    return false;
  }
}

/**
 * Safely invalidates one or more cache keys.
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;
  try {
    await Promise.all(keys.map((k) => redis!.del(k)));
  } catch (err) {
    console.warn(`[Redis] invalidateCache error for keys:`, keys, err);
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
 * Stores an ephemeral OTP in Upstash with automated TTL expiration.
 * Replaces any existing OTP for this email and purpose.
 */
export async function storeRedisOtp(
  email: string,
  otp: string,
  purpose = "register",
  ttlSeconds = REDIS_OTP_TTL_SECONDS
): Promise<boolean> {
  if (!redis) return false;
  const key = getOtpKey(email, purpose);
  try {
    const payload: StoredOtpData = {
      otp: otp.trim(),
      attempts: 0,
      createdAt: Date.now(),
    };
    await redis.set(key, payload, { ex: ttlSeconds });
    return true;
  } catch (err) {
    console.warn(`[Redis] storeRedisOtp error for "${email}":`, err);
    return false;
  }
}

/**
 * Verifies an ephemeral OTP against Redis.
 * - Single-use: If valid, atomically deletes the key.
 * - Brute-force protection: Increments attempt counter. After 5 failed attempts, deletes key.
 */
export async function verifyRedisOtp(
  email: string,
  otp: string,
  purpose = "register"
): Promise<OtpVerificationResult> {
  if (!redis) {
    return { valid: false, reason: "not_found" };
  }

  const key = getOtpKey(email, purpose);

  try {
    const data = await redis.get<StoredOtpData>(key);

    if (!data || !data.otp) {
      return { valid: false, reason: "expired" };
    }

    if (data.otp !== otp.trim()) {
      const attempts = (data.attempts || 0) + 1;

      if (attempts >= 5) {
        // Exceeded brute force threshold - delete immediately
        await redis.del(key);
        return { valid: false, reason: "too_many_attempts" };
      }

      // Preserve remaining TTL when updating attempt count
      const remainingTtl = await redis.ttl(key);
      const ttl = remainingTtl > 0 ? remainingTtl : 60;
      await redis.set(key, { ...data, attempts }, { ex: ttl });

      return {
        valid: false,
        reason: "invalid",
        attemptsRemaining: Math.max(0, 5 - attempts),
      };
    }

    // Code matched! Delete key immediately (single-use consumption)
    await redis.del(key);
    return { valid: true };
  } catch (err) {
    console.warn(`[Redis] verifyRedisOtp error for "${email}":`, err);
    return { valid: false, reason: "not_found" };
  }
}

/**
 * Deletes an active OTP key from Redis (e.g., after manual invalidation or cleanup).
 */
export async function deleteRedisOtp(
  email: string,
  purpose = "register"
): Promise<void> {
  if (!redis) return;
  const key = getOtpKey(email, purpose);
  try {
    await redis.del(key);
  } catch (err) {
    console.warn(`[Redis] deleteRedisOtp error for "${key}":`, err);
  }
}

// ---------------------------------------------------------------------------
// SUB-MILLISECOND RATE LIMITING
// ---------------------------------------------------------------------------

/**
 * Atomic rate limiter utilizing Redis INCR + EXPIRE.
 * Returns true if request is allowed, false if limit exceeded.
 * Returns null if Redis is unavailable (allowing fallback to MongoDB).
 */
export async function checkRedisRateLimit(
  key: string,
  limit = AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  windowSeconds = AUTH_RATE_LIMIT_WINDOW_SECONDS
): Promise<boolean | null> {
  if (!redis) return null;
  const redisKey = `ratelimit:${key.toLowerCase().trim()}`;

  try {
    const attempts = await redis.incr(redisKey);
    if (attempts === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return attempts <= limit;
  } catch (err) {
    console.warn(`[Redis] checkRedisRateLimit error for "${redisKey}":`, err);
    return null;
  }
}

/**
 * Clears a rate limit bucket in Redis (e.g. on successful login).
 */
export async function resetRedisRateLimit(key: string): Promise<void> {
  if (!redis) return;
  const redisKey = `ratelimit:${key.toLowerCase().trim()}`;
  try {
    await redis.del(redisKey);
  } catch (err) {
    console.warn(`[Redis] resetRedisRateLimit error for "${redisKey}":`, err);
  }
}
