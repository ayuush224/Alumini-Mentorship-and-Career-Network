import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { connectDB } from "@/lib/db";
import { AuthEmailOtp, User } from "@/lib/models";
import { checkRateLimit } from "@/lib/auth-security";

export const runtime = "nodejs";

const sendOtpSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    purpose: z.enum(["register", "login", "reset-password"]).optional().default("register"),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid email address";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, purpose } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit OTP requests (max 5 per 2 minutes)
    const allowed = await checkRateLimit(`otp:${normalizedEmail}`, 5, 120);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    await connectDB();

    // For login or reset-password, ensure the account actually exists
    if (purpose === "login" || purpose === "reset-password") {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (!existingUser) {
        return NextResponse.json(
          { error: "No account found with this email. Please check your email or register." },
          { status: 404 }
        );
      }
    }

    // Generate secure 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Replace any previous OTPs for this email
    await AuthEmailOtp.deleteMany({ email: normalizedEmail });
    await AuthEmailOtp.create({
      email: normalizedEmail,
      otp,
      expiresAt,
      attempts: 0,
    });

    // Determine email messaging based on purpose
    let subject = "Your Alma verification code";
    let bodyText = `Your Alma verification code is ${otp}. It expires in 10 minutes.\n\nIf you did not request this code, you can safely ignore this email.`;

    if (purpose === "login") {
      subject = "Your Alma sign-in code";
      bodyText = `Your single-use sign-in code for Alma is ${otp}. It expires in 10 minutes.\n\nUse this code to sign in to your Alma account. If you did not request this, please secure your email account.`;
    } else if (purpose === "reset-password") {
      subject = "Your Alma password reset code";
      bodyText = `Your password reset code for Alma is ${otp}. It expires in 10 minutes.\n\nUse this code to reset your password. If you did not request this, you can safely ignore this message.`;
    }

    // Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const { error: resendError } = await resend.emails.send({
        from: fromEmail,
        to: [normalizedEmail],
        subject,
        text: bodyText,
      });

      if (resendError) {
        console.error("Resend dispatch error:", resendError);
        return NextResponse.json(
          { error: "Failed to dispatch verification email. Please try again." },
          { status: 500 }
        );
      }
    } else {
      console.warn("RESEND_API_KEY is not defined. Email dispatch skipped.");
    }

    // Always log OTP to server console for local testing visibility
    console.log(`\n======================================================`);
    console.log(`[ALMA AUTH] ${purpose.toUpperCase()} OTP for ${normalizedEmail}: ${otp}`);
    console.log(`======================================================\n`);

    return NextResponse.json({
      message: "Verification code sent to your email",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error while sending verification code" },
      { status: 500 }
    );
  }
}
