import { jwtVerify, type JWTPayload } from "jose";
import { NextResponse, type NextRequest } from "next/server";

export interface VerifiedTokenPayload extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  institutionId?: string;
}

const DEFAULT_SECRET = "default_development_secret_change_me";

function getSecretKey(): Uint8Array {
  const secret = process.env.BETTER_AUTH_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

interface TokenCacheItem {
  payload: VerifiedTokenPayload | null;
  expiresAt: number;
}

const verifiedTokenCache = new Map<string, TokenCacheItem>();

function getCachedTokenPayload(token: string): VerifiedTokenPayload | null | undefined {
  const item = verifiedTokenCache.get(token);
  if (!item) return undefined;
  if (Date.now() > item.expiresAt) {
    verifiedTokenCache.delete(token);
    return undefined;
  }
  return item.payload;
}

function setCachedTokenPayload(token: string, payload: VerifiedTokenPayload | null, ttlMs = 60_000): void {
  if (verifiedTokenCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of verifiedTokenCache.entries()) {
      if (v.expiresAt <= now) verifiedTokenCache.delete(k);
    }
  }
  verifiedTokenCache.set(token, {
    payload,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Verifies a JWT access token using Web Crypto (jose) with sub-millisecond in-memory caching.
 * Safe to run in Edge Middleware, Server Components, and Node.js runtimes.
 * Returns the decoded payload if valid and unexpired; returns null otherwise.
 */
export async function verifyAccessToken(token: string | undefined | null): Promise<VerifiedTokenPayload | null> {
  if (!token || typeof token !== "string" || token.trim() === "") {
    return null;
  }

  const cached = getCachedTokenPayload(token);
  if (cached !== undefined) {
    return cached;
  }

  const key = getSecretKey();
  const configuredIssuer = process.env.BETTER_AUTH_URL || "alma-network";

  try {
    // Attempt standard verification with configured issuer and audience
    const { payload } = await jwtVerify(token, key, {
      issuer: configuredIssuer,
      audience: "alumni-api",
    });

    if (!payload || !payload.sub || typeof payload.sub !== "string") {
      setCachedTokenPayload(token, null, 10_000);
      return null;
    }

    const verified = payload as VerifiedTokenPayload;
    const expMs = typeof verified.exp === "number" ? Math.max(0, verified.exp * 1000 - Date.now()) : 60_000;
    setCachedTokenPayload(token, verified, Math.min(expMs, 60_000));
    return verified;
  } catch (err: unknown) {
    // If expired or signature failed, don't retry fallback - it's permanently invalid!
    const code = (err as { code?: string })?.code;
    if (code === "ERR_JWT_EXPIRED" || code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED" || code === "ERR_JWS_INVALID") {
      setCachedTokenPayload(token, null, 10_000);
      return null;
    }

    // Only retry if issuer or audience mismatch
    try {
      const { payload } = await jwtVerify(token, key, {
        audience: "alumni-api",
      });

      if (payload && payload.sub && typeof payload.sub === "string") {
        const verified = payload as VerifiedTokenPayload;
        setCachedTokenPayload(token, verified, 60_000);
        return verified;
      }
    } catch {
      try {
        const { payload } = await jwtVerify(token, key);
        if (payload && payload.sub && typeof payload.sub === "string") {
          const verified = payload as VerifiedTokenPayload;
          setCachedTokenPayload(token, verified, 60_000);
          return verified;
        }
      } catch {}
    }

    setCachedTokenPayload(token, null, 10_000);
    return null;
  }
}

/**
 * Purges all authentication session cookies from an outgoing HTTP response.
 * Sets maxAge=0 and expires in the past with path=/ to ensure the browser discards them.
 */
export function clearResponseAuthCookies(response: NextResponse): void {
  const isProduction = process.env.NODE_ENV === "production";
  const clearCookieOptions = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
  };

  response.cookies.set("access_token", "", clearCookieOptions);
  response.cookies.set("refresh_token", "", clearCookieOptions);
  response.cookies.set("better-auth.session_token", "", clearCookieOptions);
}

/**
 * Creates a redirect to /login and forcibly clears all authentication cookies.
 * This completely breaks infinite redirect loops (login <-> dashboard) caused by corrupt/expired cookies.
 */
export function redirectToLoginWithCleanCookies(
  request: NextRequest,
  callbackPath?: string
): NextResponse {
  const redirectUrl = new URL("/login", request.url);
  if (callbackPath && callbackPath !== "/" && callbackPath !== "/dashboard") {
    redirectUrl.searchParams.set("callbackUrl", callbackPath);
  }

  const response = NextResponse.redirect(redirectUrl);
  clearResponseAuthCookies(response);
  return response;
}

/**
 * Role categorization helpers.
 */
export function isMentorRole(role?: string): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (
    normalized === "alumni" ||
    normalized === "mentor" ||
    normalized === "alumni_mentor"
  );
}

export function isOfficerRole(role?: string): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (
    normalized === "alumni_relations_officer" ||
    normalized === "administrator" ||
    normalized === "admin" ||
    normalized === "placement_officer"
  );
}

export function isStudentRole(role?: string): boolean {
  if (!role) return true; // Default role is student
  const normalized = role.toLowerCase();
  return normalized === "student";
}

/**
 * Returns the canonical dashboard route for a given user role.
 */
export function getRoleDashboard(role?: string): string {
  if (isMentorRole(role)) {
    return "/mentor/dashboard";
  }
  if (isOfficerRole(role)) {
    return "/officer";
  }
  return "/student/dashboard";
}
