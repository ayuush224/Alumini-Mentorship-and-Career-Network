import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeRefresh } from "@/lib/app-tokens";

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

    if (refreshToken) {
      await revokeRefresh(refreshToken).catch((err) => {
        console.error("Error revoking refresh token on logout:", err);
      });
    }

    const acceptHeader = request?.headers?.get("accept") || "";
    const contentTypeHeader = request?.headers?.get("content-type") || "";
    const isBrowserForm =
      acceptHeader.includes("text/html") ||
      contentTypeHeader.includes("application/x-www-form-urlencoded");

    let response: NextResponse;
    if (isBrowserForm) {
      const redirectUrl = new URL("/login", request?.url || "http://localhost:3000");
      response = NextResponse.redirect(redirectUrl, { status: 303 });
    } else {
      response = NextResponse.json({ success: true });
    }

    const isProduction = process.env.NODE_ENV === "production";

    // Expire and clear session cookies completely
    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });

    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });

    response.cookies.set("better-auth.session_token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error during logout" },
      { status: 500 }
    );
  }
}

export async function GET(request?: Request) {
  return POST(request);
}
