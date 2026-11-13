import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AuthEmailOtp } from "@/lib/models";
import { verifyRedisOtp } from "@/lib/redis";

export const runtime = "nodejs";

const verifyOtpSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    otp: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
    purpose: z.enum(["register", "login", "reset-password"]).optional().default("register"),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid verification input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, otp, purpose } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. First attempt to verify against Upstash Redis
    const redisResult = await verifyRedisOtp(normalizedEmail, otp, purpose);

    if (redisResult.valid) {
      return NextResponse.json({
        success: true,
        message: "Email verified successfully",
      });
    }

    if (redisResult.reason === "too_many_attempts") {
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new code." },
        { status: 400 }
      );
    }

    if (redisResult.reason === "invalid") {
      const remainingText = redisResult.attemptsRemaining !== undefined
        ? ` (${redisResult.attemptsRemaining} attempts remaining)`
        : "";
      return NextResponse.json(
        { error: `Incorrect verification code. Please check your email and try again.${remainingText}` },
        { status: 400 }
      );
    }

    // 2. If not found or expired in Redis, check MongoDB fallback
    await connectDB();
    const record = await AuthEmailOtp.findOne({ email: normalizedEmail });

    if (!record || record.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired or was not requested. Please click 'Send a new code'." },
        { status: 400 }
      );
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        await AuthEmailOtp.deleteOne({ _id: record._id });
        return NextResponse.json(
          { error: "Too many incorrect attempts. Please request a new code." },
          { status: 400 }
        );
      }
      await record.save();
      return NextResponse.json(
        { error: "Incorrect verification code. Please check your email and try again." },
        { status: 400 }
      );
    }

    // OTP is valid in MongoDB! Delete record so it cannot be reused
    await AuthEmailOtp.deleteOne({ _id: record._id });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error verifying code" },
      { status: 500 }
    );
  }
}
