import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { signAccessToken, generateRefreshToken } from "@/lib/app-tokens";
import { checkRateLimit, resetRateLimit } from "@/lib/auth-security";

export const runtime = "nodejs";

const loginSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid login credentials";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Enforce 2-minute / 5-attempt rate limit prior to password verification
    const allowed = await checkRateLimit(normalizedEmail);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again after 2 minutes." },
        { status: 429 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Reset rate limit on successful authentication
    await resetRateLimit(normalizedEmail);

    const userId = String(user._id);
    const accessToken = await signAccessToken({
      id: userId,
      email: user.email,
      role: user.role,
    });
    const refreshToken = await generateRefreshToken(userId);

    const response = NextResponse.json({
      user: {
        id: userId,
        email: user.email,
        role: user.role,
      },
    });

    const isProduction = process.env.NODE_ENV === "production";
    const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (604,800 seconds)

    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error during login" },
      { status: 500 }
    );
  }
}
