"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Mail,
  ShieldCheck,
  CheckCircle2,
  User,
  Users,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ArrowRight,
  Briefcase,
  Compass,
  Globe,
  GraduationCap,
  Calendar,
  HeartHandshake,
  Loader2,
  Check,
  ArrowLeft,
  AlertCircle,
  UploadCloud,
  FileCheck2,
  Clock,
  X,
} from "lucide-react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  label?: string;
  error?: string;
}

/**
 * Reusable input component with left icon and optional right action icon.
 */
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
            error ? "border-rose-300 focus:border-rose-500 ring-1 ring-rose-100" : "border-stone-200 focus:border-stone-400"
          } rounded-xl py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-600/15 transition-all ${
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

export default function RegisterPage() {
  const router = useRouter();

  // Multi-step state:
  // Step 1: Role Selection (First choice: Student vs Alumni)
  // Step 2: Email Collection
  // Step 3: OTP Verification
  // Step 4: Password Creation
  // Step 5: Profile Setup (5A for Student, 5B for Alumni)
  // Step 6: Success State
  const [step, setStep] = useState<number>(1);

  // Form fields state
  const [role, setRole] = useState<"student" | "alumni">("student");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Student profile fields state
  const [fullName, setFullName] = useState("");
  const [careerInterests, setCareerInterests] = useState("");
  const [rolesExploring, setRolesExploring] = useState("");
  const [industriesCurious, setIndustriesCurious] = useState("");

  // Alumni profile fields state
  const [institutionalId, setInstitutionalId] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [professionalHeadline, setProfessionalHeadline] = useState("");
  const [mentoringInterests, setMentoringInterests] = useState("");
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [extraDocFile, setExtraDocFile] = useState<File | null>(null);

  // UI status state
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendNotification, setResendNotification] = useState(false);

  // STEP 1: Continue from Role Selection
  const handleContinueRole = () => {
    setErrorMessage("");
    setStep(2);
  };

  // STEP 2: Submit Email and Trigger Real OTP Email via API
  const handleContinueEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to send verification code. Please try again.");
        setIsLoading(false);
        return;
      }

      setStep(3);
    } catch (err) {
      console.error("Send OTP error:", err);
      setErrorMessage("Network error while sending verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Verify OTP via Backend API
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMessage("Please enter the 6-digit code sent to your email.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: cleanOtp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Invalid verification code.");
        setIsLoading(false);
        return;
      }

      setStep(4);
    } catch (err) {
      console.error("Verify OTP error:", err);
      setErrorMessage("Network error while verifying code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP Action
  const handleResendOtp = async () => {
    setErrorMessage("");
    try {
      const response = await fetch("/api/v1/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        setResendNotification(true);
        setTimeout(() => setResendNotification(false), 5000);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to resend code.");
      }
    } catch {
      setErrorMessage("Network error. Could not resend code.");
    }
  };

  // STEP 4: Continue from Password Creation
  const handleContinuePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    setStep(5);
  };

  // STEP 5: Final Submission -> Register API
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (role === "alumni" && !idProofFile) {
      setErrorMessage("Please upload your Institutional ID proof document so the officer can verify your request.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email.trim().toLowerCase());
      formData.append("password", password);
      formData.append("role", role);
      formData.append("fullName", fullName.trim());

      if (role === "student") {
        formData.append("careerInterests", careerInterests.trim());
        formData.append("rolesExploring", rolesExploring.trim());
        formData.append("industriesCurious", industriesCurious.trim());
      } else {
        formData.append("institutionalId", institutionalId.trim());
        formData.append("graduationYear", graduationYear.trim());
        formData.append("currentRole", currentRole.trim());
        formData.append("industry", industry.trim());
        formData.append("professionalHeadline", professionalHeadline.trim());
        formData.append("mentoringInterests", mentoringInterests.trim());
        if (idProofFile) formData.append("idProof", idProofFile);
        if (extraDocFile) formData.append("extraDocument", extraDocFile);
      }

      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to create account. Please try again.");
        setIsLoading(false);
        return;
      }

      // Successful registration
      setStep(6);
    } catch (err) {
      console.error("Registration submission error:", err);
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 p-8 relative transition-all">
      {/* Terracotta Sparkle Icon (Top-Right) */}
      <div className="absolute top-7 right-7 text-primary-600 pointer-events-none">
        <Sparkles className="w-4 h-4" />
      </div>

      {/* ================================================================ */}
      {/* STEP 1: ROLE SELECTION (FIRST STEP UPON CLICKING REGISTER)       */}
      {/* ================================================================ */}
      {step === 1 && (
        <div className="flex flex-col">
          <span className="uppercase tracking-widest text-[10px] font-semibold text-stone-400">
            YOUR COMMUNITY
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 mb-1 font-serif tracking-tight">
            How are you joining Alma?
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mb-6 leading-relaxed">
            Select whether you are joining as a student or an alumni mentor.
          </p>

          <div className="flex flex-col gap-3">
            {/* Option 1: Student */}
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                role === "student"
                  ? "border-primary-600 bg-primary-600/5 ring-1 ring-primary-600"
                  : "border-stone-200 hover:border-stone-300 bg-white"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  role === "student" ? "bg-primary-600 text-white" : "bg-stone-100 text-stone-600"
                }`}
              >
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-900">I&apos;m a student</h3>
                  {role === "student" && (
                    <span className="w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center text-white">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Build your path with guidance and support from alumni.
                </p>
              </div>
            </button>

            {/* Option 2: Alumni */}
            <button
              type="button"
              onClick={() => setRole("alumni")}
              className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                role === "alumni"
                  ? "border-primary-600 bg-primary-600/5 ring-1 ring-primary-600"
                  : "border-stone-200 hover:border-stone-300 bg-white"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  role === "alumni" ? "bg-primary-600 text-white" : "bg-stone-100 text-stone-600"
                }`}
              >
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-900">I&apos;m an alum</h3>
                  {role === "alumni" && (
                    <span className="w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center text-white">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Share what you&apos;ve learned and guide university students.
                </p>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={handleContinueRole}
            className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white rounded-lg py-3 mt-6 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-sm cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Link back to login */}
          <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Already have an account?</span>
            <Link
              href="/login"
              className="text-primary-600 hover:text-primary-700 font-semibold transition-colors flex items-center gap-1 group"
            >
              <span>Sign in</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* STEP 2: EMAIL COLLECTION                                         */}
      {/* ================================================================ */}
      {step === 2 && (
        <form onSubmit={handleContinueEmail} className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="uppercase tracking-widest text-[10px] font-semibold text-stone-400">
              EMAIL
            </span>
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setStep(1);
              }}
              className="text-[11px] text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Change role ({role === "student" ? "Student" : "Alum"})</span>
            </button>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 mb-1 font-serif tracking-tight">
            {role === "student" ? "What's your student email?" : "What's your email address?"}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mb-6 leading-relaxed">
            {role === "student"
              ? "Enter your email to receive a 6-digit verification code."
              : "Enter your email for alumni identity verification."}
          </p>

          <FormInput
            type="email"
            placeholder={role === "student" ? "aarav@university.edu" : "priya@alumni.edu"}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            icon={<Mail className="w-4 h-4" />}
            autoFocus
            required
            error={errorMessage}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white rounded-lg py-3 mt-5 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending verification code...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ================================================================ */}
      {/* STEP 3: OTP VERIFICATION                                         */}
      {/* ================================================================ */}
      {step === 3 && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col">
          <span className="uppercase tracking-widest text-[10px] font-semibold text-stone-400">
            EMAIL VERIFICATION
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 mb-1 font-serif tracking-tight">
            Verify your email.
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mb-6 leading-relaxed">
            We sent a six digit code to{" "}
            <span className="font-semibold text-stone-700">{email || "your email"}</span>.
          </p>

          <FormInput
            type="text"
            placeholder="123456"
            value={otp}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setOtp(val);
              if (errorMessage) setErrorMessage("");
            }}
            maxLength={6}
            className="tracking-[0.35em] text-center font-mono font-semibold text-base"
            icon={<ShieldCheck className="w-4 h-4" />}
            autoFocus
            required
            error={errorMessage}
          />

          {/* Light green success banner */}
          <div className="flex items-center gap-2.5 p-3 mt-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>We sent a six digit code to your email. Check your inbox and spam folder.</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white rounded-lg py-3 mt-5 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying code...</span>
              </>
            ) : (
              <>
                <span>Verify email</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Actions below button */}
          <div className="flex items-center justify-between mt-4 text-xs text-stone-500">
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setStep(2);
              }}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Use a different method
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Send a new code
            </button>
          </div>

          {resendNotification && (
            <div className="text-center text-xs text-emerald-600 mt-2 font-medium">
              A new code was dispatched to your inbox.
            </div>
          )}
        </form>
      )}

      {/* ================================================================ */}
      {/* STEP 4: PASSWORD CREATION                                        */}
      {/* ================================================================ */}
      {step === 4 && (
        <form onSubmit={handleContinuePassword} className="flex flex-col">
          <span className="uppercase tracking-widest text-[10px] font-semibold text-stone-400">
            ACCOUNT SECURITY
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 mb-1 font-serif tracking-tight">
            Create a password.
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mb-6 leading-relaxed">
            Use at least eight characters. You&apos;ll add your profile details next.
          </p>

          <FormInput
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
            autoFocus
            required
            error={errorMessage}
          />

          <button
            type="submit"
            className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white rounded-lg py-3 mt-5 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-sm cursor-pointer"
          >
            <span>Continue to your profile</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* ================================================================ */}
      {/* STEP 5A: STUDENT PROFILE SETUP (IF STUDENT SELECTED)             */}
      {/* ================================================================ */}
      {step === 5 && role === "student" && (
        <form onSubmit={handleCreateAccount} className="flex flex-col">
          <span className="uppercase tracking-widest text-[10px] font-semibold text-stone-400">
            PROFILE
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 mb-1 font-serif tracking-tight">
            A little about you.
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mb-5 leading-relaxed">
            Add your institution and the career areas you&apos;re exploring.
          </p>

          <div className="flex flex-col gap-3">
            {/* Full Name */}
            <FormInput
              label="Full Name"
              type="text"
              placeholder="e.g. Aarav Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={<User className="w-4 h-4" />}
              required
            />

            {/* Read-Only Institution Box */}
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">
                Institution
              </label>
              <div className="flex items-center gap-2.5 p-2.5 bg-stone-100/90 border border-stone-200/60 rounded-xl text-xs sm:text-sm text-stone-700 font-medium select-none">
                <Building2 className="w-4 h-4 text-stone-500 shrink-0" />
                <span>Lovely Professional University</span>
              </div>
            </div>

            {/* Career Interests */}
            <FormInput
              label="Career interests"
              type="text"
              placeholder="Design, data, product"
              value={careerInterests}
              onChange={(e) => setCareerInterests(e.target.value)}
              icon={<Compass className="w-4 h-4" />}
            />

            {/* Roles Exploring */}
            <FormInput
              label="Roles you're exploring"
              type="text"
              placeholder="Product designer, analyst"
              value={rolesExploring}
              onChange={(e) => setRolesExploring(e.target.value)}
              icon={<Briefcase className="w-4 h-4" />}
            />

            {/* Industries Curious */}
            <FormInput
              label="Industries you're curious about"
              type="text"
              placeholder="Technology, healthcare"
              value={industriesCurious}
              onChange={(e) => setIndustriesCurious(e.target.value)}
              icon={<Globe className="w-4 h-4" />}
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 mt-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white rounded-lg py-3 mt-6 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ================================================================ */}
      {/* STEP 5B: ALUMNI PROFILE SETUP (IF ALUMNI SELECTED)               */}
      {/* ================================================================ */}
      {step === 5 && role === "alumni" && (
        <form onSubmit={handleCreateAccount} className="flex flex-col">
          <span className="uppercase tracking-widest text-[10px] font-semibold text-stone-400">
            PROFILE
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 mb-1 font-serif tracking-tight">
            A little about you.
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mb-4 leading-relaxed">
            Add your alumni details so your verification request can be reviewed.
          </p>

          <div className="flex flex-col gap-3">
            {/* Full Name */}
            <FormInput
              label="Full Name"
              type="text"
              placeholder="e.g. Priya Nair"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={<User className="w-4 h-4" />}
              required
            />

            {/* Read-Only Institution Box */}
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">
                Institution
              </label>
              <div className="flex items-center gap-2.5 p-2.5 bg-stone-100/90 border border-stone-200/60 rounded-xl text-xs sm:text-sm text-stone-700 font-medium select-none">
                <Building2 className="w-4 h-4 text-stone-500 shrink-0" />
                <span>Lovely Professional University</span>
              </div>
            </div>

            {/* Institutional ID */}
            <FormInput
              label="Institutional ID"
              type="text"
              placeholder="Your former student ID"
              value={institutionalId}
              onChange={(e) => setInstitutionalId(e.target.value)}
              icon={<GraduationCap className="w-4 h-4" />}
            />

            {/* Split Row: Graduation Year & Current Role */}
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Graduation Year"
                type="text"
                placeholder="e.g. 2020"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                icon={<Calendar className="w-4 h-4" />}
              />
              <FormInput
                label="Current Role"
                type="text"
                placeholder="e.g. Lead Designer"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                icon={<Briefcase className="w-4 h-4" />}
              />
            </div>

            {/* Industry */}
            <FormInput
              label="Industry"
              type="text"
              placeholder="e.g. FinTech, Healthcare"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              icon={<Globe className="w-4 h-4" />}
            />

            {/* Professional Headline (Optional) */}
            <FormInput
              label="Professional Headline (Optional)"
              type="text"
              placeholder="e.g. Building scalable cloud platforms"
              value={professionalHeadline}
              onChange={(e) => setProfessionalHeadline(e.target.value)}
              icon={<Sparkles className="w-4 h-4" />}
            />

            {/* Mentoring Interests */}
            <FormInput
              label="Mentoring Interests"
              type="text"
              placeholder="e.g. Portfolio reviews, career pivots"
              value={mentoringInterests}
              onChange={(e) => setMentoringInterests(e.target.value)}
              icon={<HeartHandshake className="w-4 h-4" />}
            />

            {/* FIELD 1: Institutional ID Proof Upload */}
            <div className="w-full">
              <label className="block text-xs font-medium text-stone-600 mb-1.5 flex items-center justify-between">
                <span>Institutional ID Proof (Student ID / Degree) <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-stone-400">PDF, PNG, JPG (Max 10MB)</span>
              </label>
              {idProofFile ? (
                <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200/90 rounded-xl text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck2 className="w-4 h-4 text-primary-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 truncate">{idProofFile.name}</p>
                      <p className="text-[10px] text-stone-500">{(idProofFile.size / 1024).toFixed(0)} KB • Ready to verify</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIdProofFile(null)}
                    className="p-1 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded-lg transition-colors ml-2 shrink-0 cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-3.5 border border-dashed border-stone-300 hover:border-primary-600 rounded-xl bg-stone-50/60 hover:bg-blue-50/30 cursor-pointer transition-all group">
                  <UploadCloud className="w-5 h-5 text-stone-400 group-hover:text-primary-600 mb-1 transition-colors" />
                  <span className="text-xs font-medium text-stone-700 group-hover:text-primary-600">
                    Upload Institutional ID Proof
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5">
                    Click to select university student card, degree, or transcript
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setIdProofFile(file);
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* FIELD 2: Additional Supporting Document Upload */}
            <div className="w-full">
              <label className="block text-xs font-medium text-stone-600 mb-1.5 flex items-center justify-between">
                <span>Additional Document (Optional)</span>
                <span className="text-[10px] text-stone-400">Experience, offer letter, or ID</span>
              </label>
              {extraDocFile ? (
                <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200/90 rounded-xl text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck2 className="w-4 h-4 text-primary-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 truncate">{extraDocFile.name}</p>
                      <p className="text-[10px] text-stone-500">{(extraDocFile.size / 1024).toFixed(0)} KB • Attached</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtraDocFile(null)}
                    className="p-1 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded-lg transition-colors ml-2 shrink-0 cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-3.5 border border-dashed border-stone-300 hover:border-primary-600 rounded-xl bg-stone-50/60 hover:bg-blue-50/30 cursor-pointer transition-all group">
                  <UploadCloud className="w-5 h-5 text-stone-400 group-hover:text-primary-600 mb-1 transition-colors" />
                  <span className="text-xs font-medium text-stone-700 group-hover:text-primary-600">
                    Upload Extra Supporting Document
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5">
                    Optional: Offer letter, company badge, or work certificate
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setExtraDocFile(file);
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Yellow/Orange pending banner */}
          <div className="p-3 bg-amber-50/90 border border-amber-200/70 rounded-xl text-xs text-amber-800 leading-relaxed mt-3 flex items-start gap-2">
            <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
            <span>
              Your mentor profile stays pending until the institution verifies your alumni status.
            </span>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 mt-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white rounded-lg py-3 mt-5 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ================================================================ */}
      {/* STEP 6: ACCOUNT CREATED SUCCESS                                  */}
      {/* ================================================================ */}
      {step === 6 && (
        <div className="flex flex-col items-center text-center py-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            role === "student" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          }`}>
            {role === "student" ? <Check className="w-6 h-6 stroke-[2.5]" /> : <Clock className="w-6 h-6 stroke-[2.5]" />}
          </div>
          <span className="uppercase tracking-widest text-[10px] font-semibold text-stone-400">
            {role === "student" ? "WELCOME TO ALMA" : "VERIFICATION SUBMITTED"}
          </span>
          <h1 className="text-2xl font-bold text-stone-900 mt-1 mb-2 font-serif">
            {role === "student"
              ? `You're all set${fullName ? `, ${fullName.split(" ")[0]}` : ""}!`
              : "Verification Request Received!"}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mb-6 leading-relaxed max-w-xs">
            {role === "student"
              ? "Your student account is active. Start exploring verified mentors right away."
              : "Your alumni profile and institutional ID proof are pending verification by the Alumni Relations Office. You will receive an email once your account has been verified."}
          </p>

          <button
            type="button"
            onClick={() => router.push(role === "student" ? "/student/dashboard" : "/mentor/dashboard")}
            className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white rounded-lg py-3 flex justify-center items-center gap-2 transition-all font-medium text-sm shadow-sm cursor-pointer"
          >
            <span>{role === "student" ? "Go to your dashboard" : "Check Verification Status"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom Lock Security Text (All steps) */}
      <div className="flex items-center gap-2 text-xs text-stone-400 mt-6 justify-center text-center">
        <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <span>Your details are saved to your institution&apos;s Alma network.</span>
      </div>
    </div>
  );
}
