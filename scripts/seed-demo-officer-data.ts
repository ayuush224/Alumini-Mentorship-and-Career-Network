import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import {
  User,
  AlumniProfile,
  StudentProfile,
  MentorCapacity,
  Institution,
  ProgrammeConfiguration,
} from "../src/lib/models";
import {
  VerificationRequest,
  VerificationDocument,
} from "../src/lib/models/Verification";
import {
  Mentorship,
  Session,
} from "../src/lib/models/Mentorship";
import {
  AuditLog,
} from "../src/lib/models/Analytics";

// Load .env or .env.local
const envFiles = [".env.local", ".env"];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const idx = trimmed.indexOf("=");
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

async function seedOfficerDemoData() {
  console.log("=================================================");
  console.log("Seeding Realistic Officer Command Center Demo Data");
  console.log("=================================================");

  await connectDB();
  const institutionId = "INST-001";
  const dummyPassword = await bcrypt.hash("Password@123", 10);

  // 1. Ensure Institution
  let institution = await Institution.findOne({ code: institutionId });
  if (!institution) {
    institution = await Institution.create({
      code: institutionId,
      name: "Lovely Professional University",
      domain: "lpu.in",
      status: "active",
      officeLocation: "Division of Alumni Relations, Block 32-402",
      officeHours: "Mon–Fri, 9:00 AM – 5:00 PM",
    });
    console.log("✓ Created institution INST-001");
  } else {
    institution.officeLocation = institution.officeLocation || "Division of Alumni Relations, Block 32-402";
    institution.officeHours = institution.officeHours || "Mon–Fri, 9:00 AM – 5:00 PM";
    await institution.save();
    console.log(`✓ Verified institution: ${institution.name} (${institution.code})`);
  }

  // 2. Ensure Programme Configuration
  let progConfig = await ProgrammeConfiguration.findOne({ institutionId });
  if (!progConfig) {
    progConfig = await ProgrammeConfiguration.create({
      institutionId,
      maxPendingRequestsPerStudent: 3,
      requestExpiryDays: 14,
      defaultMaxMentees: 2,
      inactivityNudgeDays: 14,
      nudgeCooldownDays: 7,
      allowStudentScheduling: true,
      requireAdminVerification: true,
    });
    console.log("✓ Created programme configuration");
  }

  // 3. Ensure Officer Account
  const officerEmail = "officer@university.edu";
  let officerUser = await User.findOne({ email: officerEmail });
  if (!officerUser) {
    officerUser = await User.create({
      email: officerEmail,
      password: await bcrypt.hash("Officer@123", 10),
      name: "Dr. Eleanor Vance",
      role: "alumni_relations_officer",
      institutionId,
      twoFactorEnabled: true,
    });
    console.log("✓ Created officer user: officer@university.edu");
  } else {
    officerUser.role = "alumni_relations_officer";
    officerUser.institutionId = institutionId;
    await officerUser.save();
    console.log("✓ Verified officer account");
  }

  // 4. Seed Verified Alumni Mentors (Mixed Capacities)
  const mentorsSeedData = [
    {
      name: "Priya Nair",
      email: "priya.nair@example.com",
      company: "Stripe",
      jobTitle: "Senior Software Engineer",
      industry: "FinTech",
      expertiseTags: ["TypeScript", "Next.js", "System Design", "AWS"],
      maxMentees: 2,
      activeMentees: 1,
      acceptingRequests: true,
      degree: "B.Tech Computer Science & Eng.",
      gradYear: 2017,
      identifier: "LPU-ALUM-2017-091",
    },
    {
      name: "Rohan Kapoor",
      email: "rohan.kapoor@example.com",
      company: "Microsoft",
      jobTitle: "Principal Product Manager",
      industry: "Technology",
      expertiseTags: ["Product Strategy", "User Research", "Agile Roadmap"],
      maxMentees: 3,
      activeMentees: 3, // Saturated 100%!
      acceptingRequests: true,
      degree: "MBA Technology Management",
      gradYear: 2015,
      identifier: "LPU-ALUM-2015-112",
    },
    {
      name: "Ananya Deshmukh",
      email: "ananya.deshmukh@example.com",
      company: "Figma",
      jobTitle: "Design Systems Lead",
      industry: "Design",
      expertiseTags: ["Figma", "Design Systems", "UI/UX Architecture"],
      maxMentees: 2,
      activeMentees: 2, // Saturated 100%!
      acceptingRequests: true,
      degree: "B.Des Digital Product Design",
      gradYear: 2018,
      identifier: "LPU-ALUM-2018-403",
    },
    {
      name: "Vikram Iyer",
      email: "vikram.iyer@example.com",
      company: "Google Cloud",
      jobTitle: "Cloud Solutions Architect",
      industry: "Cloud & DevOps",
      expertiseTags: ["Kubernetes", "GCP", "Terraform", "Distributed Systems"],
      maxMentees: 3,
      activeMentees: 2, // Near Capacity
      acceptingRequests: true,
      degree: "M.S. Distributed Systems",
      gradYear: 2016,
      identifier: "LPU-ALUM-2016-724",
    },
    {
      name: "Sneha Mukherjee",
      email: "sneha.mukherjee@example.com",
      company: "Anthropic",
      jobTitle: "AI Research Engineer",
      industry: "Artificial Intelligence",
      expertiseTags: ["PyTorch", "LLMs", "Machine Learning", "Python"],
      maxMentees: 2,
      activeMentees: 0, // Available
      acceptingRequests: true,
      degree: "B.Tech Computer Science (Honors)",
      gradYear: 2021,
      identifier: "LPU-ALUM-2021-508",
    },
    {
      name: "Karan Verma",
      email: "karan.verma@example.com",
      company: "Amazon",
      jobTitle: "Engineering Manager",
      industry: "E-Commerce",
      expertiseTags: ["Engineering Leadership", "System Architecture", "Hiring"],
      maxMentees: 2,
      activeMentees: 1,
      acceptingRequests: false, // Paused!
      degree: "B.Tech Information Technology",
      gradYear: 2014,
      identifier: "LPU-ALUM-2014-032",
    },
    {
      name: "Dr. Marcus Vance",
      email: "marcus.vance@example.com",
      company: "Apple",
      jobTitle: "Director of Silicon Architecture",
      industry: "Semiconductors",
      expertiseTags: ["VLSI Design", "Hardware Architecture", "R&D"],
      maxMentees: 3,
      activeMentees: 1, // Available
      acceptingRequests: true,
      degree: "Ph.D. Microelectronics",
      gradYear: 2012,
      identifier: "LPU-ALUM-2012-005",
    },
  ];

  const mentorUserMap = new Map<string, mongoose.Types.ObjectId>();

  for (const m of mentorsSeedData) {
    let u = await User.findOne({ email: m.email });
    if (!u) {
      u = await User.create({
        email: m.email,
        password: dummyPassword,
        name: m.name,
        role: "alumni",
        institutionId,
      });
    } else {
      u.role = "alumni";
      u.institutionId = institutionId;
      await u.save();
    }
    mentorUserMap.set(m.name, u._id as mongoose.Types.ObjectId);

    // Profile
    await AlumniProfile.findOneAndUpdate(
      { userId: u._id },
      {
        userId: u._id,
        company: m.company,
        jobTitle: m.jobTitle,
        industry: m.industry,
        expertiseTags: m.expertiseTags,
      },
      { upsert: true }
    );

    // Capacity
    await MentorCapacity.findOneAndUpdate(
      { mentorId: u._id },
      {
        mentorId: u._id,
        maxMentees: m.maxMentees,
        activeMentees: m.activeMentees,
        acceptingRequests: m.acceptingRequests,
      },
      { upsert: true }
    );

    // Verified Verification Record
    await VerificationRequest.findOneAndUpdate(
      { institutionalIdentifier: m.identifier },
      {
        institutionId,
        alumnusId: u._id,
        userId: u._id,
        institutionalIdentifier: m.identifier,
        graduationYear: m.gradYear,
        degree: m.degree,
        status: "verified",
        submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        decidedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
        decidedBy: officerUser._id,
      },
      { upsert: true }
    );
  }
  console.log(`✓ Seeded ${mentorsSeedData.length} verified alumni mentors with capacity distributions`);

  // 5. Seed Priority Pending Verifications (Awaiting Officer Approval)
  const pendingAlumniData = [
    {
      name: "Dr. Aakash Sharma",
      email: "aakash.sharma@alumni.lpu.in",
      degree: "M.S. Artificial Intelligence & Robotics",
      gradYear: 2022,
      identifier: "LPU-ALUM-2022-8921",
      submittedDaysAgo: 1,
    },
    {
      name: "Meera Patel",
      email: "meera.patel@alumni.lpu.in",
      degree: "B.Tech Computer Science & Engineering",
      gradYear: 2020,
      identifier: "LPU-ALUM-2020-4102",
      submittedDaysAgo: 2,
    },
    {
      name: "Rajesh Krishnan",
      email: "rajesh.krishnan@alumni.lpu.in",
      degree: "MBA Executive Technology Management",
      gradYear: 2018,
      identifier: "LPU-ALUM-2018-7734",
      submittedDaysAgo: 3,
    },
    {
      name: "Tanya Sen",
      email: "tanya.sen@alumni.lpu.in",
      degree: "B.Des Digital Product Architecture",
      gradYear: 2021,
      identifier: "LPU-ALUM-2021-3091",
      submittedDaysAgo: 4,
    },
  ];

  for (const p of pendingAlumniData) {
    let u = await User.findOne({ email: p.email });
    if (!u) {
      u = await User.create({
        email: p.email,
        password: dummyPassword,
        name: p.name,
        role: "alumni",
        institutionId,
      });
    }

    const submittedDate = new Date(Date.now() - p.submittedDaysAgo * 24 * 60 * 60 * 1000);

    // Create a mock verification document
    const doc = await VerificationDocument.create({
      institutionId,
      userId: u._id,
      objectKey: `quarantine/${u._id}/degree_certificate.pdf`,
      fileName: `${p.name.replace(/\s+/g, "_")}_Degree_Certificate.pdf`,
      fileUrl: "https://example.com/mock-transcript.pdf",
      declaredContentType: "application/pdf",
      detectedContentType: "application/pdf",
      sizeBytes: 1024 * 750,
      status: "approved",
      uploadedAt: submittedDate,
    });

    await VerificationRequest.findOneAndUpdate(
      { institutionalIdentifier: p.identifier },
      {
        institutionId,
        alumnusId: u._id,
        userId: u._id,
        institutionalIdentifier: p.identifier,
        graduationYear: p.gradYear,
        degree: p.degree,
        status: "pending",
        submittedAt: submittedDate,
        documents: [doc._id],
      },
      { upsert: true }
    );
  }
  console.log(`✓ Seeded ${pendingAlumniData.length} pending verification requests`);

  // 6. Seed Students
  const studentsSeed = [
    { name: "Rahul Gupta", email: "rahul.gupta@student.lpu.in" },
    { name: "Ananya Roy", email: "ananya.roy@student.lpu.in" },
    { name: "Simran Kaur", email: "simran.kaur@student.lpu.in" },
    { name: "Kevin Zhang", email: "kevin.zhang@student.lpu.in" },
    { name: "Aditi Sharma", email: "aditi.sharma@student.lpu.in" },
    { name: "David Chen", email: "david.chen@student.lpu.in" },
  ];

  const studentUserMap = new Map<string, mongoose.Types.ObjectId>();

  for (const s of studentsSeed) {
    let u = await User.findOne({ email: s.email });
    if (!u) {
      u = await User.create({
        email: s.email,
        password: dummyPassword,
        name: s.name,
        role: "student",
        institutionId,
      });
    }
    studentUserMap.set(s.name, u._id as mongoose.Types.ObjectId);

    await StudentProfile.findOneAndUpdate(
      { userId: u._id },
      {
        userId: u._id,
        skills: ["React", "TypeScript", "Python"],
        targetJobRoles: ["Software Engineer", "Product Specialist"],
      },
      { upsert: true }
    );
  }
  console.log(`✓ Seeded ${studentsSeed.length} student accounts`);

  // 7. Seed Active Mentorship Pairings with Varied Health Momentum
  // Healthy (2-4 days ago), At Risk (8-11 days ago), Stalled (16-24 days ago)
  const pairingsSeed = [
    {
      student: "Rahul Gupta",
      mentor: "Priya Nair",
      daysAgoLastSession: 2, // Healthy!
      title: "Bi-Weekly Sprint Review & Portfolio Critique",
    },
    {
      student: "Ananya Roy",
      mentor: "Vikram Iyer",
      daysAgoLastSession: 4, // Healthy!
      title: "Cloud Infrastructure & Terraform Architecture Prep",
    },
    {
      student: "Simran Kaur",
      mentor: "Dr. Marcus Vance",
      daysAgoLastSession: 3, // Healthy!
      title: "Hardware Design Research & Graduate Roadmap",
    },
    {
      student: "Kevin Zhang",
      mentor: "Vikram Iyer",
      daysAgoLastSession: 9, // At Risk (8-13 days)
      title: "Microservices Deployment Pipeline Debugging",
    },
    {
      student: "Aditi Sharma",
      mentor: "Rohan Kapoor",
      daysAgoLastSession: 11, // At Risk (8-13 days)
      title: "Product PRD Feedback & Strategy Mapping",
    },
    {
      student: "David Chen",
      mentor: "Rohan Kapoor",
      daysAgoLastSession: 19, // Stalled! (>14 days)
      title: "Introductory Mentorship Scope Alignment",
    },
    {
      student: "Rahul Gupta",
      mentor: "Ananya Deshmukh",
      daysAgoLastSession: 24, // Stalled! (>14 days)
      title: "Design Systems Token Mapping",
    },
  ];

  for (const p of pairingsSeed) {
    const studentId = studentUserMap.get(p.student);
    const mentorId = mentorUserMap.get(p.mentor);
    if (!studentId || !mentorId) continue;

    const lastActivity = new Date(Date.now() - p.daysAgoLastSession * 24 * 60 * 60 * 1000);

    let mentorship = await Mentorship.findOne({ studentId, mentorId, status: "active" });
    if (!mentorship) {
      mentorship = await Mentorship.create({
        studentId,
        mentorId,
        status: "active",
        startDate: new Date(Date.now() - (p.daysAgoLastSession + 20) * 24 * 60 * 60 * 1000),
      });
    }

    // Seed session record driving the lastActivity recency
    await Session.findOneAndUpdate(
      { menteeId: studentId, mentorId, title: p.title },
      {
        mentorId,
        menteeId: studentId,
        title: p.title,
        date: lastActivity,
        time: "4:00 PM",
        durationMinutes: 45,
        location: "Alma Video Room #104",
        status: "completed",
        prerequisites: ["Review previous action items"],
      },
      { upsert: true }
    );
  }
  console.log(`✓ Seeded ${pairingsSeed.length} active mentorship pairings (3 healthy, 2 at-risk, 2 stalled)`);

  // 8. Seed Realistic Audit Trail Logs
  const auditLogsSeed = [
    {
      action: "VERIFICATION_APPROVED",
      resource: "UserCredential",
      details: { alumnus: "Dr. Marcus Vance", degree: "Ph.D. Microelectronics", identifier: "LPU-ALUM-2012-005" },
      hoursAgo: 1,
    },
    {
      action: "MOMENTUM_NUDGE_SENT",
      resource: "Mentorship",
      details: { student: "David Chen", mentor: "Rohan Kapoor", reason: "19_days_inactivity" },
      hoursAgo: 4,
    },
    {
      action: "CAPACITY_LIMIT_UPDATED",
      resource: "MentorCapacity",
      details: { mentor: "Vikram Iyer", prevMax: 2, newMax: 3 },
      hoursAgo: 7,
    },
    {
      action: "INSTITUTION_DETAILS_UPDATED",
      resource: "Institution",
      details: { officeHours: "Mon–Fri, 9:00 AM – 5:00 PM", officeLocation: "Division of Alumni Relations" },
      hoursAgo: 12,
    },
    {
      action: "OFFICER_NAME_UPDATED",
      resource: "User",
      details: { name: "Dr. Eleanor Vance" },
      hoursAgo: 18,
    },
    {
      action: "COMPLIANCE_REPORT_EXPORTED",
      resource: "ProgramAnalytics",
      details: { format: "CSV", recordsExported: 48, contactShieldActive: true },
      hoursAgo: 26,
    },
    {
      action: "CREDENTIAL_DOCUMENT_REVIEWED",
      resource: "VerificationDocument",
      details: { document: "Aakash_Sharma_Degree.pdf", status: "quarantine_passed" },
      hoursAgo: 30,
    },
    {
      action: "TWO_FACTOR_ENROLLED",
      resource: "SecurityCredential",
      details: { officer: "officer@university.edu", mfaType: "TOTP" },
      hoursAgo: 38,
    },
  ];

  for (const log of auditLogsSeed) {
    const timestamp = new Date(Date.now() - log.hoursAgo * 60 * 60 * 1000);
    await AuditLog.create({
      institutionId,
      actorId: officerUser._id,
      actorRole: "alumni_relations_officer",
      action: log.action,
      resource: log.resource,
      details: log.details,
      timestamp,
    });
  }
  console.log(`✓ Seeded ${auditLogsSeed.length} institutional audit events`);

  console.log("=================================================");
  console.log("Demo Data Seeding Successfully Completed!");
  console.log("=================================================");
  await mongoose.disconnect();
}

seedOfficerDemoData().catch((err) => {
  console.error("Failed to seed demo data:", err);
  process.exit(1);
});
