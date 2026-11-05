import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { User } from "../src/lib/models/User";

// Load .env.local if present
const envLocalPath = path.resolve(process.cwd(), ".env.local");
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

async function seedOfficer() {
  console.log("Starting Alumni Relations Officer provisioning...");
  await connectDB();

  const officerEmail = (process.env.OFFICER_SEED_EMAIL || "officer@university.edu").toLowerCase().trim();
  const rawPassword = process.env.OFFICER_SEED_PASSWORD || "Officer@123";
  const institutionId = process.env.OFFICER_INSTITUTION_ID || "INST-001";
  const officerName = "Alumni Relations Officer";

  const existing = await User.findOne({ email: officerEmail });

  if (existing) {
    console.log(`User ${officerEmail} already exists. Updating role and institution...`);
    existing.role = "alumni_relations_officer";
    existing.institutionId = institutionId;
    existing.name = existing.name || officerName;
    await existing.save();
    console.log(`Officer account updated successfully (ID: ${existing._id}).`);
  } else {
    console.log(`Creating new officer account for ${officerEmail}...`);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const newOfficer = await User.create({
      email: officerEmail,
      password: hashedPassword,
      name: officerName,
      role: "alumni_relations_officer",
      institutionId,
      twoFactorEnabled: false,
    });
    console.log(`Officer account created successfully (ID: ${newOfficer._id}).`);
  }

  console.log("Credentials:");
  console.log(`  Email:    ${officerEmail}`);
  console.log(`  Password: ${rawPassword}`);
  console.log(`  Role:     alumni_relations_officer`);
  console.log(`  Tenant:   ${institutionId}`);

  await mongoose.disconnect();
  console.log("Provisioning complete.");
}

seedOfficer().catch((err) => {
  console.error("Failed to provision officer:", err);
  process.exit(1);
});
