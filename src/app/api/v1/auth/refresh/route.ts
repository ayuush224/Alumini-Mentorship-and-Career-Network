import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { rotateRefreshToken, signAccessToken } from "@/lib/app-tokens";

export const runtime = "nodejs";

export async function POST(request?: Request) {
  try {
    let refreshToken: string | undefined;

    try {
      const cookieStore = await cookies();
      refreshToken = cookieStore.get("refresh_token")?.value;
    } catch {
      // Fallback if called outside Next.js request storage (e.g. testing)
      const cookieHeader = request?.headers.get("cookie") || "";
      refreshToken = cookieHeader.match(/(?:^|;\s*)refresh_token=([^;]+)/)?.[1];
    }

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token is missing" }, { status: 401 });
    }

    const rotated = await rotateRefreshToken(refreshToken);

    if (!rotated) {
      return NextResponse.json(
        { error: "Refresh token is expired, revoked, or invalid" },
        { status: 401 }
      );
    }

    // Ensure access token is issued for rotated session
    const accessToken =
      rotated.newAccessToken ||
      (await signAccessToken({
        id: String(rotated.user._id),
        email: rotated.user.email,
        role: rotated.user.role,
      }));

    const response = NextResponse.json({ success: true });
    const isProduction = process.env.NODE_ENV === "production";
    const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (604,800 seconds)

    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    response.cookies.set("refresh_token", rotated.newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error during token refresh" },
      { status: 500 }
    );
  }
}
