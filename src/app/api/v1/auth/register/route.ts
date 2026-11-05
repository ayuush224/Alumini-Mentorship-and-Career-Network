import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import {
  User,
  StudentProfile,
  MentorProfile,
  AlumniProfile,
  MentorCapacity,
} from "@/lib/models";
import { Action } from "@/lib/models/Tasks";
import { signAccessToken, generateRefreshToken } from "@/lib/app-tokens";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum(["student", "alumni", "administrator"]).default("student"),
  fullName: z.string().trim().optional(),
  name: z.string().trim().optional(),
  institutionId: z.string().trim().optional(),
  // Student fields
  careerInterests: z.string().trim().optional(),
  rolesExploring: z.string().trim().optional(),
  industriesCurious: z.string().trim().optional(),
  targetIndustries: z.array(z.string()).optional(),
  skillsToDevelop: z.array(z.string()).optional(),
  major: z.string().trim().optional(),
  graduationYear: z.union([z.string(), z.number()]).optional(),
  // Alumni fields
  institutionalId: z.string().trim().optional(),
  currentRole: z.string().trim().optional(),
  company: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  professionalHeadline: z.string().trim().optional(),
  headline: z.string().trim().optional(),
  mentoringInterests: z.string().trim().optional(),
  expertiseTags: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid registration data";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const {
      email,
      password,
      role,
      fullName,
      name,
      institutionId,
      careerInterests,
      rolesExploring,
      industriesCurious,
      targetIndustries,
      skillsToDevelop,
      major,
      graduationYear,
      currentRole,
      company,
      jobTitle,
      industry,
      professionalHeadline,
      headline,
      mentoringInterests,
      expertiseTags,
    } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();
    const resolvedName =
      fullName?.trim() ||
      name?.trim() ||
      normalizedEmail.split("@")[0] ||
      (role === "alumni" ? "Alumni Mentor" : "Student");
    const resolvedInstitution = institutionId?.trim() || "Lovely Professional University";

    await connectDB();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email address" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare role-specific profile payloads
    let studentProfilePayload: Record<string, unknown> | undefined = undefined;
    let mentorProfilePayload: Record<string, unknown> | undefined = undefined;

    if (role === "student") {
      const parsedTargetIndustries =
        targetIndustries && targetIndustries.length > 0
          ? targetIndustries
          : industriesCurious
          ? industriesCurious
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : ["Technology"];

      const parsedSkillsToDevelop =
        skillsToDevelop && skillsToDevelop.length > 0
          ? skillsToDevelop
          : careerInterests
          ? careerInterests
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      const parsedMajor =
        major?.trim() || (rolesExploring?.trim() ? rolesExploring.trim() : "Undergraduate Student");
      const parsedGradYear = graduationYear
        ? Number(graduationYear)
        : new Date().getFullYear() + 2;

      studentProfilePayload = {
        bio: careerInterests ? `Exploring ${careerInterests}` : "",
        major: parsedMajor,
        graduationYear: parsedGradYear,
        targetIndustries: parsedTargetIndustries,
        skillsToDevelop: parsedSkillsToDevelop,
        skills: parsedSkillsToDevelop,
        projects: [],
        experience: [],
        totalPoints: 0,
      };
    } else if (role === "alumni") {
      const parsedJobTitle = currentRole?.trim() || jobTitle?.trim() || "Mentor";
      const parsedCompany = company?.trim() || "Independent";
      const parsedIndustry = industry?.trim() || "Technology";
      const parsedHeadline =
        professionalHeadline?.trim() ||
        headline?.trim() ||
        (currentRole?.trim() ? `${currentRole.trim()} · Alma Mentor` : "Alma Verified Mentor");
      const parsedBio = mentoringInterests?.trim()
        ? `Interested in mentoring students on: ${mentoringInterests.trim()}`
        : "";

      const parsedTags =
        expertiseTags && expertiseTags.length > 0
          ? expertiseTags
          : mentoringInterests
          ? mentoringInterests
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : ["Career Guidance", "Mentorship"];

      const parsedSkills = parsedTags.map((name) => ({ name, endorsements: 0 }));

      mentorProfilePayload = {
        jobTitle: parsedJobTitle,
        company: parsedCompany,
        industry: parsedIndustry,
        headline: parsedHeadline,
        bio: parsedBio,
        availability: "open",
        expertiseTags: parsedTags,
        skills: parsedSkills,
        mentorshipAreas: [
          {
            title: "Career & Technical Guidance",
            description: `Mentoring in ${parsedIndustry} and ${parsedJobTitle} pathways.`,
          },
        ],
        experience: [],
        featuredWork: [],
        totalMentees: 0,
        sessionsCompleted: 0,
      };
    }

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: resolvedName,
      role,
      institutionId: resolvedInstitution,
      studentProfile: studentProfilePayload,
      mentorProfile: mentorProfilePayload,
    });

    const userId = String(user._id);

    // Create standalone documents in matching collections
    if (role === "student" && studentProfilePayload) {
      await StudentProfile.findOneAndUpdate(
        { userId: user._id },
        { $set: { userId: user._id, ...studentProfilePayload } },
        { upsert: true }
      );

      // Seed 3 interactive real starter tasks in MongoDB for the new student
      await Action.insertMany([
        {
          studentId: user._id,
          title: "Explore verified alumni mentors in your focus industries",
          dueDate: new Date(Date.now() + 86400000 * 2),
          completed: false,
          addedBy: "mentor",
          pointsAwarded: false,
          status: "active",
        },
        {
          studentId: user._id,
          title: "Review career goals and update your student skills profile",
          dueDate: new Date(Date.now() + 86400000 * 4),
          completed: false,
          addedBy: "mentor",
          pointsAwarded: false,
          status: "active",
        },
        {
          studentId: user._id,
          title: "Draft questions and schedule your first 1-on-1 mentorship consultation",
          dueDate: new Date(Date.now() + 86400000 * 6),
          completed: false,
          addedBy: "student",
          pointsAwarded: false,
          status: "active",
        },
      ]);
    } else if (role === "alumni" && mentorProfilePayload) {
      await MentorProfile.findOneAndUpdate(
        { userId: user._id },
        { $set: { userId: user._id, ...mentorProfilePayload } },
        { upsert: true }
      );

      await AlumniProfile.findOneAndUpdate(
        { userId: user._id },
        { $set: { userId: user._id, ...mentorProfilePayload } },
        { upsert: true }
      );

      // Enforce Invariant 1: Ensure mentor capacity document exists so mentor is discoverable
      const maxLimit = Number(process.env.MAX_MENTEES_PER_MENTOR || 5);
      await MentorCapacity.findOneAndUpdate(
        { mentorId: user._id },
        { $set: { mentorId: user._id, maxMentees: maxLimit, activeMentees: 0 } },
        { upsert: true }
      );
    }

    const accessToken = await signAccessToken({
      id: userId,
      email: user.email,
      role: user.role,
    });
    const refreshToken = await generateRefreshToken(userId);

    const response = NextResponse.json(
      {
        user: {
          id: userId,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );

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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
