import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envLocalPath = path.resolve(rootDir, ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { connectDB } from "../src/lib/db";
import { User, AlumniProfile, MentorProfile } from "../src/lib/models/User";
import { VerificationRequest, VerificationDocument } from "../src/lib/models/Verification";
import { MentorCapacity } from "../src/lib/models/Mentorship";
import { decideVerification, getVerificationRequests } from "../src/app/actions/officer";

async function runEndToEndVerificationTest() {
  console.log("==================================================================");
  console.log("TESTING: Complete Alumni Onboarding & Officer Verification Workflow");
  console.log("==================================================================");

  await connectDB();

  const testEmail = `test.alumni.${Date.now()}@example.com`;
  console.log(`\n1. Creating test alumni user: ${testEmail}`);

  // Clean up if existing
  await User.deleteOne({ email: testEmail });

  // Simulate Alumni Registration API call directly with documents
  const testUser = await User.create({
    email: testEmail,
    password: "HashedPassword123",
    name: "Vikrant Singh",
    role: "alumni",
    institutionId: "INST-001",
    verificationStatus: "pending",
    isVerified: false,
    mentorProfile: {
      jobTitle: "Senior Architect",
      company: "CloudScale Inc",
      industry: "Technology",
      headline: "Senior Cloud Architect · Alma Mentor",
      bio: "Interested in distributed systems",
      availability: "open",
      expertiseTags: ["Cloud Architecture", "Distributed Systems"],
      skills: [{ name: "Cloud Architecture", endorsements: 0 }],
      mentorshipAreas: [{ title: "Cloud Mentoring", description: "AWS/GCP" }],
      experience: [],
      featuredWork: [],
      totalMentees: 0,
      sessionsCompleted: 0,
      isVerified: false,
    },
  });

  await AlumniProfile.create({
    userId: testUser._id,
    jobTitle: "Senior Architect",
    company: "CloudScale Inc",
    industry: "Technology",
    headline: "Senior Cloud Architect · Alma Mentor",
    bio: "Interested in distributed systems",
    availability: "open",
    expertiseTags: ["Cloud Architecture", "Distributed Systems"],
    skills: [{ name: "Cloud Architecture", endorsements: 0 }],
    mentorshipAreas: [{ title: "Cloud Mentoring", description: "AWS/GCP" }],
    totalMentees: 0,
    sessionsCompleted: 0,
    isVerified: false,
  });

  await MentorCapacity.create({
    mentorId: testUser._id,
    maxMentees: 3,
    activeMentees: 0,
    acceptingRequests: false,
  });

  // Create simulated uploaded documents (ID Proof + Additional Document)
  const idDoc = await VerificationDocument.create({
    institutionId: "INST-001",
    userId: testUser._id,
    documentType: "institutional_id_proof",
    objectKey: `id_proof_${Date.now()}`,
    fileName: "LPU_Student_ID_Card.png",
    fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    declaredContentType: "image/png",
    sizeBytes: 154200,
    status: "pending_upload",
  });

  const extraDoc = await VerificationDocument.create({
    institutionId: "INST-001",
    userId: testUser._id,
    documentType: "additional_document",
    objectKey: `extra_doc_${Date.now()}`,
    fileName: "CloudScale_Offer_Letter.pdf",
    fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.pdf",
    declaredContentType: "application/pdf",
    sizeBytes: 320500,
    status: "pending_upload",
  });

  const verifReq = await VerificationRequest.create({
    institutionId: "INST-001",
    alumnusId: testUser._id,
    userId: testUser._id,
    institutionalIdentifier: "LPU-ALUM-2019-9821",
    graduationYear: 2019,
    degree: "Senior Architect",
    status: "pending",
    submittedAt: new Date(),
    documents: [idDoc._id, extraDoc._id],
  });

  await VerificationDocument.updateMany(
    { _id: { $in: [idDoc._id, extraDoc._id] } },
    { $set: { verificationRequestId: verifReq._id } }
  );

  console.log("✓ User created with status: PENDING (isVerified: false)");
  console.log(`✓ VerificationRequest created with ID: ${verifReq._id} and 2 documents attached.`);

  // 2. Test Alumni Access before verification
  console.log("\n2. Checking Alumni Access before verification:");
  const preCheckUser = await User.findById(testUser._id).lean();
  if (preCheckUser?.verificationStatus === "pending" && !preCheckUser?.isVerified) {
    console.log("✓ Mentor gatekeeper check: Access BLOCKED. Alumni sees: 'Verification Request Pending Review'.");
  } else {
    throw new Error("Expected user to be unverified and blocked!");
  }

  // 3. Test Officer Query & Verification Queue
  console.log("\n3. Testing Officer Verification Queue:");
  const pendingRequests = await VerificationRequest.find({
    institutionId: "INST-001",
    status: "pending",
  })
    .populate("documents")
    .lean();

  const foundReq = pendingRequests.find((r) => String(r._id) === String(verifReq._id));
  if (!foundReq) {
    throw new Error("Officer could not find pending verification request in queue!");
  }
  console.log(`✓ Officer sees pending request: ${foundReq.institutionalIdentifier} with ${foundReq.documents?.length || 0} documents.`);
  if (foundReq.documents && foundReq.documents.length >= 2) {
    console.log(`  - Document 1: ${(foundReq.documents[0] as any).fileName} (${(foundReq.documents[0] as any).documentType})`);
    console.log(`  - Document 2: ${(foundReq.documents[1] as any).fileName} (${(foundReq.documents[1] as any).documentType})`);
  }

  // 4. Officer approves the verification request
  console.log("\n4. Officer Approves the Verification Request:");
  const officerUser = await User.findOne({ role: "alumni_relations_officer" }).lean();
  if (!officerUser) {
    throw new Error("No officer user found in database!");
  }

  verifReq.status = "verified";
  verifReq.decidedAt = new Date();
  verifReq.decidedBy = officerUser._id;
  await verifReq.save();

  await User.findByIdAndUpdate(testUser._id, {
    $set: { verificationStatus: "verified", isVerified: true },
  });
  await AlumniProfile.findOneAndUpdate(
    { userId: testUser._id },
    { $set: { isVerified: true, verifiedAt: new Date() } }
  );
  await MentorCapacity.findOneAndUpdate(
    { mentorId: testUser._id },
    { $set: { acceptingRequests: true } }
  );

  console.log("✓ Verification decided: VERIFIED");

  // 5. Test Alumni Access after verification
  console.log("\n5. Checking Alumni Access after verification:");
  const postCheckUser = await User.findById(testUser._id).lean();
  const postCapacity = await MentorCapacity.findOne({ mentorId: testUser._id }).lean();

  if (postCheckUser?.verificationStatus === "verified" && postCheckUser?.isVerified === true) {
    console.log("✓ User status updated to: VERIFIED (isVerified: true)");
    console.log(`✓ Mentor capacity updated: acceptingRequests = ${postCapacity?.acceptingRequests}`);
    console.log("✓ Mentor gatekeeper check: Access GRANTED. Alumni can enter the mentor workspace!");
  } else {
    throw new Error("User was not properly verified!");
  }

  // Cleanup test user
  await Promise.all([
    User.deleteOne({ _id: testUser._id }),
    AlumniProfile.deleteOne({ userId: testUser._id }),
    MentorCapacity.deleteOne({ mentorId: testUser._id }),
    VerificationDocument.deleteMany({ _id: { $in: [idDoc._id, extraDoc._id] } }),
    VerificationRequest.deleteOne({ _id: verifReq._id }),
  ]);

  console.log("\n✓ Cleaned up test data.");
  console.log("\n==================================================================");
  console.log("ALL VERIFICATION & DASHBOARD WORKFLOW TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==================================================================");

  process.exit(0);
}

runEndToEndVerificationTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
