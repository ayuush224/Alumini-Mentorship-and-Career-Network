import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifyAccessToken,
  clearResponseAuthCookies,
  redirectToLoginWithCleanCookies,
  isMentorRole,
  isOfficerRole,
  isStudentRole,
  getRoleDashboard,
} from "@/lib/token-verify";

/**
 * Public routes accessible without authentication.
 */
const PUBLIC_STATIC_ROUTES = new Set([
  "/",
  "/community",
  "/connect",
  "/discover",
  "/features",
  "/how-it-works",
  "/journey",
  "/measure",
  "/resources",
]);

/**
 * Public authentication routes.
 */
const AUTH_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-otp",
]);

function isPublicMarketingPath(pathname: string): boolean {
  if (PUBLIC_STATIC_ROUTES.has(pathname)) return true;
  // Dynamic sub-paths for journey marketing pages
  if (pathname.startsWith("/journey/")) return true;
  return false;
}

function isAuthPath(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

function isPublicApiPath(pathname: string): boolean {
  // Public auth API endpoints
  if (pathname.startsWith("/api/v1/auth/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip public API authentication endpoints
  if (isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  // 2. Handle non-auth API routes (/api/*)
  if (pathname.startsWith("/api/")) {
    const accessToken = request.cookies.get("access_token")?.value;
    if (accessToken) {
      const payload = await verifyAccessToken(accessToken);
      if (!payload) {
        // Invalid token on API call: return 401 and purge corrupt cookies
        const response = NextResponse.json(
          { error: "Authentication session expired or invalid" },
          { status: 401 }
        );
        clearResponseAuthCookies(response);
        return response;
      }
    }
    // Let endpoint itself enforce detailed role/entity authorization
    return NextResponse.next();
  }

  // 3. Inspect the access_token cookie
  const accessToken = request.cookies.get("access_token")?.value;

  // Case A: User is visiting an Auth page (/login, /register, etc.)
  if (isAuthPath(pathname)) {
    if (!accessToken) {
      // No token -> render auth page normally
      return NextResponse.next();
    }

    // A token exists: verify it
    const payload = await verifyAccessToken(accessToken);
    if (!payload) {
      // The cookie is corrupt/expired!
      // CRITICAL: Delete the invalid cookie right now so the user sees a clean login page
      // and does NOT get bounced back into a redirect loop!
      const response = NextResponse.next();
      clearResponseAuthCookies(response);
      return response;
    }

    // Token is valid and user is already authenticated!
    // Redirect them to their respective role dashboard so they don't see login again.
    const targetDashboard = getRoleDashboard(payload.role);
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  // Case B: User is visiting a Public Marketing page (/, /features, /how-it-works, etc.)
  if (isPublicMarketingPath(pathname)) {
    if (accessToken) {
      const payload = await verifyAccessToken(accessToken);
      if (!payload) {
        // Clear stale/expired token while allowing the public page to render
        const response = NextResponse.next();
        clearResponseAuthCookies(response);
        return response;
      }
    }
    return NextResponse.next();
  }

  // Case C: User is visiting ANY Protected Route (/student/*, /mentor/*, /officer/*, /dashboard, /profile/*, etc.)
  // 1. If access_token is missing, immediately redirect to /login with cleaned cookies
  if (!accessToken) {
    return redirectToLoginWithCleanCookies(request, pathname);
  }

  // 2. Verify the access token
  const payload = await verifyAccessToken(accessToken);

  // 3. IF TOKEN IS INVALID / EXPIRED / CORRUPTED:
  // Forcibly clear all auth cookies on the redirect response to break the infinite loop!
  if (!payload || !payload.sub) {
    return redirectToLoginWithCleanCookies(request, pathname);
  }

  const role = payload.role;

  // 4. Role-based Route Protection & Dispatching

  // Generic /dashboard: dispatch immediately to role workspace
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    const targetDashboard = getRoleDashboard(role);
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  // Student routes (/student/*): only students (or administrator)
  if (pathname.startsWith("/student")) {
    if (isMentorRole(role)) {
      return NextResponse.redirect(new URL("/mentor/dashboard", request.url));
    }
    if (isOfficerRole(role) && role !== "administrator") {
      return NextResponse.redirect(new URL("/officer", request.url));
    }
    return NextResponse.next();
  }

  // Mentor routes (/mentor/*): only mentors / alumni (or administrator)
  if (pathname.startsWith("/mentor")) {
    if (isStudentRole(role) && !isMentorRole(role) && !isOfficerRole(role)) {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
    if (isOfficerRole(role) && role !== "administrator") {
      return NextResponse.redirect(new URL("/officer", request.url));
    }
    return NextResponse.next();
  }

  // Officer routes (/officer/*): only alumni relations officers / administrators
  if (pathname.startsWith("/officer")) {
    if (!isOfficerRole(role)) {
      if (isMentorRole(role)) {
        return NextResponse.redirect(new URL("/mentor/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Public/shared profiles or any other authenticated pages
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public asset extensions (svg, png, jpg, jpeg, gif, webp, ico)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
