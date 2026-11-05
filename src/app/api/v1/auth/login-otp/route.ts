import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User, AuthEmailOtp } from "@/lib/models";
import { signAccessToken, generateRefreshToken } from "@/lib/app-tokens";
import { checkRateLimit, resetRateLimit } from "@/lib/auth-security";

export const runtime = "nodejs";

const loginOtpSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    otp: z.string().trim().length(6, "Verification code must be exactly 6 digits"),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginOtpSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid credentials provided";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, otp } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit login attempts (5 attempts per 2 minutes)
    const allowed = await checkRateLimit(`login-otp:${normalizedEmail}`, 5, 120);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again after 2 minutes." },
        { status: 429 }
      );
    }

    await connectDB();

    // Verify user account exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email. Please check your email or register." },
        { status: 404 }
      );
    }

    // Retrieve active OTP record
    const otpRecord = await AuthEmailOtp.findOne({ email: normalizedEmail });
    if (!otpRecord) {
      return NextResponse.json(
        { error: "No active verification code found. Please request a new code." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > otpRecord.expiresAt) {
      await AuthEmailOtp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Check brute force attempts
    if (otpRecord.attempts >= 5) {
      await AuthEmailOtp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify code match
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return NextResponse.json(
        { error: "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    // OTP is valid - consume it immediately
    await AuthEmailOtp.deleteMany({ email: normalizedEmail });
    await resetRateLimit(`login-otp:${normalizedEmail}`);

    const userId = String(user._id);
    const accessToken = await signAccessToken({
      id: userId,
      email: user.email,
      role: user.role,
    });
    const refreshToken = await generateRefreshToken(userId);

    const response = NextResponse.json({
      success: true,
      message: "Signed in successfully",
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
    console.error("Login OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error during code sign-in" },
      { status: 500 }
    );
  }
}
