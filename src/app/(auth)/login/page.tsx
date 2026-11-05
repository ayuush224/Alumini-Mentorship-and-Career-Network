"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
} from "lucide-react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  label?: string;
  error?: string;
}

function FormInput({
  icon,
  rightIcon,
  onRightIconClick,
  label,
  error,
  className = "",
  ...props
}: FormInputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-stone-600 mb-1.5">{label}</label>}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3.5 text-stone-400 pointer-events-none flex items-center justify-center">
            {icon}
          </span>
        )}
        <input
          className={`w-full bg-white border ${
            error
              ? "border-rose-300 focus:border-rose-500 ring-1 ring-rose-100"
              : "border-stone-200 focus:border-stone-400"
          } rounded-xl py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 transition-all ${
            icon ? "pl-10" : "pl-3.5"
          } ${rightIcon ? "pr-10" : "pr-3.5"} ${className}`}
          {...props}
        />
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute right-3.5 text-stone-400 hover:text-stone-600 transition-colors p-0.5"
            tabIndex={-1}
          >
            {rightIcon}
          </button>
        )}
      </div>
      {error && <span className="block text-xs text-rose-500 mt-1">{error}</span>}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  // Top-level view mode: "login" or "forgot-password"
  const [view, setView] = useState<"login" | "forgot-password">("login");

  // Login method tab: "password" or "otp"
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");

  // Form field states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Login states
  const [loginOtpStep, setLoginOtpStep] = useState<1 | 2>(1); // 1 = Enter Email, 2 = Enter Code
  const [loginOtp, setLoginOtp] = useState("");

  // Forgot Password states
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1 = Enter Email, 2 = Enter Code + New Password
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // UI state
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendNotification, setResendNotification] = useState(false);

  // Reset notifications on tab / view switch
  const handleSwitchTab = (tab: "password" | "otp") => {
    setLoginMethod(tab);
    setErrorMessage("");
    setSuccessMessage("");
    setLoginOtpStep(1);
    setLoginOtp("");
  };

  const handleSwitchToForgotPassword = () => {
    setView("forgot-password");
    setErrorMessage("");
    setSuccessMessage("");
    setForgotStep(1);
    setForgotOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleBackToLogin = () => {
    setView("login");
    setErrorMessage("");
    setSuccessMessage("");
  };

  // =========================================================================
  // 1. PASSWORD LOGIN HANDLER
  // =========================================================================
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail.toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to sign in. Please verify your credentials.");
        setIsLoading(false);
        return;
      }

      if (data.user?.role === "alumni" || data.user?.role === "mentor" || data.user?.role === "alumni_mentor") {
        router.push("/mentor/dashboard");
      } else if (data.user?.role === "alumni_relations_officer") {
        router.push("/officer");
      } else if (data.user?.role === "administrator" || data.user?.role === "admin" || data.user?.role === "placement_officer") {
        router.push("/analytics");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      console.error("Login submission error:", err);
      setErrorMessage("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  // =========================================================================
  // 2. OTP LOGIN HANDLERS
  // =========================================================================
  // Step 2A: Send OTP for Login
  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail.toLowerCase(),
          purpose: "login",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to send sign-in code.");
        setIsLoading(false);
        return;
      }

      setLoginOtpStep(2);
      setSuccessMessage(`We sent a 6-digit sign-in code to ${trimmedEmail}.`);
    } catch {
      setErrorMessage("Network error while sending code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2B: Verify OTP & Log In
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanOtp = loginOtp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMessage("Please enter the 6-digit sign-in code.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Invalid verification code.");
        setIsLoading(false);
        return;
      }

      if (data.user?.role === "alumni" || data.user?.role === "mentor" || data.user?.role === "alumni_mentor") {
        router.push("/mentor/dashboard");
      } else if (data.user?.role === "alumni_relations_officer") {
        router.push("/officer");
      } else if (data.user?.role === "administrator" || data.user?.role === "admin" || data.user?.role === "placement_officer") {
        router.push("/analytics");
      } else {
        router.push("/student/dashboard");
      }
    } catch {
      setErrorMessage("Network error while signing in with code.");
      setIsLoading(false);
    }
  };

  // Resend Login OTP
  const handleResendLoginOtp = async () => {
    setErrorMessage("");
    try {
      const response = await fetch("/api/v1/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: "login",
        }),
      });

      if (response.ok) {
        setResendNotification(true);
        setTimeout(() => setResendNotification(false), 5000);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Could not resend code.");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    }
  };

  // =========================================================================
  // 3. FORGOT PASSWORD HANDLERS
  // =========================================================================
  // Step 3A: Send Reset Password OTP
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail.toLowerCase(),
          purpose: "reset-password",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to send password reset code.");
        setIsLoading(false);
        return;
      }

      setForgotStep(2);
      setSuccessMessage(`We sent a 6-digit password reset code to ${trimmedEmail}.`);
    } catch {
      setErrorMessage("Network error while requesting reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3B: Submit OTP + New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanOtp = forgotOtp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to reset password.");
        setIsLoading(false);
        return;
      }

      // Password reset successful! Return to login screen with prefilled email
      setView("login");
      setLoginMethod("password");
      setPassword("");
      setSuccessMessage("Your password was updated successfully! You can now sign in with your new password.");
    } catch {
      setErrorMessage("Network error while resetting password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 p-8 relative transition-all">
      {/* Terracotta Sparkle Icon (Top-Right) */}
      <div className="absolute top-7 right-7 text-[#2563EB] pointer-events-none">
        <Sparkles className="w-4 h-4" />
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 mb-5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2 p-3 mb-5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {resendNotification && (
        <div className="flex items-start gap-2 p-3 mb-5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>A fresh verification code was sent to your email.</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW A: FORGOT PASSWORD FLOW                                       */}
      {/* =================================================================== */}
      {view === "forgot-password" ? (
        <div className="flex flex-col">
          <span className="uppercase tracking-widest text-[10px] font-semibold text-stone-400">
            ACCOUNT RECOVERY
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 mb-1 font-serif tracking-tight">
            Reset your password.
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mb-6 leading-relaxed">
            {forgotStep === 1
              ? "Enter your verified Alma email to receive a password reset code."
              : `Enter the code sent to ${email} and set your new password.`}
          </p>

          {forgotStep === 1 ? (
            /* Step 1: Email */
            <form onSubmit={handleSendForgotOtp} className="flex flex-col gap-4">
              <FormInput
                label="Registered email address"
                type="email"
                placeholder="aarav@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                autoFocus
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white rounded-lg py-3 mt-2 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending code...</span>
                  </>
                ) : (
                  <>
                    <span>Send reset code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 mt-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </button>
            </form>
          ) : (
            /* Step 2: OTP + New Password */
            <form onSubmit={handleResetPassword} className="flex flex-col gap-3.5">
              <FormInput
                label="6-Digit Verification Code"
                type="text"
                placeholder="1 2 3 4 5 6"
                maxLength={6}
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                icon={<ShieldCheck className="w-4 h-4" />}
                className="tracking-widest font-mono text-center"
                autoFocus
                required
              />

              <FormInput
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                rightIcon={
                  showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />
                }
                onRightIconClick={() => setShowNewPassword(!showNewPassword)}
                required
              />

              <FormInput
                label="Confirm New Password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Re-type new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white rounded-lg py-3 mt-2 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <span>Set new password &amp; sign in</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-stone-500 pt-2">
                <button
                  type="button"
                  onClick={handleSendForgotOtp}
                  className="hover:text-stone-900 transition-colors"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="hover:text-stone-900 transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* =================================================================== */
        /* VIEW B: STANDARD LOGIN (PASSWORD vs OTP TABS)                       */
        /* =================================================================== */
        <div className="flex flex-col">
          <span className="uppercase tracking-widest text-[10px] font-semibold text-stone-400">
            SIGN IN
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 mb-1 font-serif tracking-tight">
            Welcome back to Alma.
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mb-5 leading-relaxed">
            Choose your preferred sign-in method to access your network.
          </p>

          {/* Login Method Tab Selector */}
          <div className="flex items-center p-1 bg-stone-100 rounded-xl mb-5 text-xs font-medium text-stone-600">
            <button
              type="button"
              onClick={() => handleSwitchTab("password")}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                loginMethod === "password"
                  ? "bg-white text-stone-900 font-semibold shadow-xs"
                  : "hover:text-stone-900"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab("otp")}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                loginMethod === "otp"
                  ? "bg-white text-stone-900 font-semibold shadow-xs"
                  : "hover:text-stone-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Email Code (OTP)</span>
            </button>
          </div>

          {/* TAB 1: PASSWORD LOGIN */}
          {loginMethod === "password" ? (
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3.5">
              <FormInput
                label="Email address"
                type="email"
                placeholder="aarav@university.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                icon={<Mail className="w-4 h-4" />}
                autoFocus
                required
              />

              <div>
                <FormInput
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  icon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />
                  }
                  onRightIconClick={() => setShowPassword(!showPassword)}
                  required
                />
                {/* Forgot Password Link */}
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={handleSwitchToForgotPassword}
                    className="text-[11px] text-stone-500 hover:text-[#2563EB] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white rounded-lg py-3 mt-3 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in with password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB 2: OTP / CODE LOGIN */
            <div>
              {loginOtpStep === 1 ? (
                /* Step 1: Collect Email */
                <form onSubmit={handleSendLoginOtp} className="flex flex-col gap-3.5">
                  <FormInput
                    label="Email address"
                    type="email"
                    placeholder="aarav@university.edu"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage("");
                    }}
                    icon={<Mail className="w-4 h-4" />}
                    autoFocus
                    required
                  />

                  <p className="text-[11px] text-stone-400">
                    We will send a 6-digit one-time code to this address for passwordless sign-in.
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white rounded-lg py-3 mt-2 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send login code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Enter OTP */
                <form onSubmit={handleVerifyLoginOtp} className="flex flex-col gap-3.5">
                  <div className="p-3 bg-stone-50 border border-stone-200/60 rounded-xl text-xs text-stone-600 flex items-center justify-between">
                    <span className="truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginOtpStep(1);
                        setLoginOtp("");
                      }}
                      className="text-[#2563EB] hover:underline font-medium text-[11px] shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>

                  <FormInput
                    label="6-Digit Sign-in Code"
                    type="text"
                    placeholder="1 2 3 4 5 6"
                    maxLength={6}
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ""))}
                    icon={<ShieldCheck className="w-4 h-4" />}
                    className="tracking-widest font-mono text-center text-base"
                    autoFocus
                    required
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white rounded-lg py-3 mt-2 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify &amp; sign in</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                    <button
                      type="button"
                      onClick={handleResendLoginOtp}
                      className="hover:text-stone-900 transition-colors"
                    >
                      Send a new code
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchTab("password")}
                      className="hover:text-stone-900 transition-colors"
                    >
                      Use password instead
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Bottom Register Option */}
          <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Don&apos;t have an account yet?</span>
            <Link
              href="/register"
              className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition-colors flex items-center gap-1 group"
            >
              <span>Register</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Bottom Security Note */}
          <div className="flex items-center gap-2 text-xs text-stone-400 mt-6 justify-center text-center">
            <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>Your details are saved to your institution&apos;s Alma network.</span>
          </div>
        </div>
      )}
    </div>
  );
}
