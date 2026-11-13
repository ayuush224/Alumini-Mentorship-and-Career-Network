import { randomBytes, timingSafeEqual } from "node:crypto";
import { connectDB } from "@/lib/db";
import { AuthRateLimit } from "@/lib/models";
import { verifyAccess, getUserById } from "@/lib/app-tokens";
import { checkRedisRateLimit, resetRedisRateLimit } from "@/lib/redis";
import {
  AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  AUTH_RATE_LIMIT_WINDOW_SECONDS,
} from "@/lib/config";

/** HTTP methods that require CSRF and origin validation. */
const mutating = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Generates a cryptographically secure random CSRF token (base64url-encoded). */
export function csrfToken() {
  return randomBytes(32).toString("base64url");
}

/** Validates that a mutating request passes both origin and CSRF checks. */
export function checkRequest(request: Request) {
  if (!mutating.has(request.method)) return true;
  return checkOrigin(request) && checkCsrf(request);
}

/** Validates the request origin against the AUTH_TRUSTED_ORIGINS allow-list. */
export function checkOrigin(request: Request) {
  const allowed = new Set((process.env.AUTH_TRUSTED_ORIGINS || "http://localhost:3000").split(",").filter(Boolean));
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;
  try {
    if (!allowed.has(new URL(source).origin)) return false;
  } catch {
    return false;
  }
  return true;
}

/** Performs timing-safe CSRF double-submit cookie verification. */
function checkCsrf(request: Request) {
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1];
  const header = request.headers.get("x-csrf-token");
  if (!cookie || !header || cookie.length !== header.length) return false;
  return timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
}

/** Extracts and verifies the current user from the access_token cookie. */
export async function currentUser(request: Request) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)access_token=([^;]+)/)?.[1];
  const payload = token && (await verifyAccess(token));
  if (typeof payload?.sub !== "string") return null;
  const user = await getUserById(payload.sub);
  return user ? { user } : null;
}

/** Enforces CSRF validation, authentication, and role-based access control in a single call. */
export async function requireRole(request: Request, roles: string[]) {
  if (!checkRequest(request)) return { error: "CSRF or origin validation failed", status: 403 as const };
  const session = await currentUser(request);
  if (!session) return { error: "Authentication required", status: 401 as const };
  const role = (session.user as typeof session.user & { role?: string }).role || "student";
  if (!roles.includes(role)) return { error: "Forbidden", status: 403 as const };
  return { session, role };
}

/**
 * High-speed rate limiter using Upstash Redis in-memory counters with automatic
 * fail-safe fallback to MongoDB AuthRateLimit collection.
 */
export async function checkRateLimit(
  key: string,
  limit = AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  windowSeconds = AUTH_RATE_LIMIT_WINDOW_SECONDS
): Promise<boolean> {
  // 1. Attempt Upstash Redis atomic INCR + EXPIRE (< 1ms)
  const redisResult = await checkRedisRateLimit(key, limit, windowSeconds);
  if (redisResult !== null) {
    return redisResult;
  }

  // 2. Fail-safe fallback to MongoDB AuthRateLimit collection
  await connectDB();
  const normalizedKey = key.toLowerCase().trim();
  const now = new Date();
  const bucket = await AuthRateLimit.findOne({ key: normalizedKey });

  if (!bucket || bucket.resetAt <= now) {
    await AuthRateLimit.findOneAndUpdate(
      { key: normalizedKey },
      { attempts: 1, resetAt: new Date(now.getTime() + windowSeconds * 1000) },
      { upsert: true, returnDocument: "after" }
    );
    return true;
  }

  if (bucket.attempts >= limit) {
    return false;
  }

  bucket.attempts += 1;
  await bucket.save();
  return true;
}

/**
 * Reset rate limit bucket on successful authentication.
 * Clears both Redis and MongoDB buckets.
 */
export async function resetRateLimit(key: string): Promise<void> {
  const normalizedKey = key.toLowerCase().trim();
  await resetRedisRateLimit(normalizedKey);

  try {
    await connectDB();
    await AuthRateLimit.deleteOne({ key: normalizedKey });
  } catch (err) {
    console.warn("[RateLimit] MongoDB resetRateLimit fallback error:", err);
  }
}

/**
 * IP/Path rate limiter compatibility helper.
 */
export async function rateLimit(
  request: Request,
  limit = 10,
  windowSeconds = 60
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${new URL(request.url).pathname}:${ip}`;
  return checkRateLimit(key, limit, windowSeconds);
}
