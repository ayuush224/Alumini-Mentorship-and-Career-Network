import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AuthEmailOtp } from "@/lib/models";

export const runtime = "nodejs";

const verifyOtpSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    otp: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
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

    const { email, otp } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

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

    // OTP is valid! Delete record so it cannot be reused
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
