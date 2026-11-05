import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, AuthEmailOtp } from "@/lib/models";
import { checkRateLimit, resetRateLimit } from "@/lib/auth-security";

export const runtime = "nodejs";

const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    otp: z.string().trim().length(6, "Verification code must be exactly 6 digits"),
    newPassword: z.string().min(8, "New password must be at least 8 characters long"),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid payload provided";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, otp, newPassword } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit reset attempts (5 attempts per 2 minutes)
    const allowed = await checkRateLimit(`reset-pass:${normalizedEmail}`, 5, 120);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again after 2 minutes." },
        { status: 429 }
      );
    }

    await connectDB();

    // Verify user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      );
    }

    // Verify OTP record
    const otpRecord = await AuthEmailOtp.findOne({ email: normalizedEmail });
    if (!otpRecord) {
      return NextResponse.json(
        { error: "No active verification code found. Please request a new code." },
        { status: 400 }
      );
    }

    if (new Date() > otpRecord.expiresAt) {
      await AuthEmailOtp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    if (otpRecord.attempts >= 5) {
      await AuthEmailOtp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 400 }
      );
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return NextResponse.json(
        { error: "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    // Hash new password securely
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    // Consume OTP and reset rate limits
    await AuthEmailOtp.deleteMany({ email: normalizedEmail });
    await resetRateLimit(`reset-pass:${normalizedEmail}`);

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error while resetting password" },
      { status: 500 }
    );
  }
}
