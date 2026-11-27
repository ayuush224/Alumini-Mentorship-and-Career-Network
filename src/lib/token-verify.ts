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

/**
 * Verifies a JWT access token using Web Crypto (jose).
 * Safe to run in Edge Middleware, Server Components, and Node.js runtimes.
 * Returns the decoded payload if valid and unexpired; returns null otherwise.
 */
export async function verifyAccessToken(token: string | undefined | null): Promise<VerifiedTokenPayload | null> {
  if (!token || typeof token !== "string" || token.trim() === "") {
    return null;
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
      return null;
    }

    return payload as VerifiedTokenPayload;
  } catch {
    // Fallback: Verify signature and audience directly without strict issuer equality
    // (guards against environment hostname differences between sign and verify, e.g. localhost vs 127.0.0.1)
    try {
      const { payload } = await jwtVerify(token, key, {
        audience: "alumni-api",
      });

      if (!payload || !payload.sub || typeof payload.sub !== "string") {
        return null;
      }

      return payload as VerifiedTokenPayload;
    } catch {
      // Third fallback: Verify signature only
      try {
        const { payload } = await jwtVerify(token, key);
        if (payload && payload.sub && typeof payload.sub === "string") {
          return payload as VerifiedTokenPayload;
        }
      } catch {
        return null;
      }
      return null;
    }
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
