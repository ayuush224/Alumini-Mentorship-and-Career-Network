import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { connectDB } from "@/lib/db";
import { User, AuthRefreshToken } from "@/lib/models";
import { db } from "@/lib/auth";

const key = () => new TextEncoder().encode(process.env.BETTER_AUTH_SECRET || "default_development_secret_change_me");
const accessSeconds = 7 * 24 * 60 * 60; // 7 days (604,800 seconds)
const refreshSeconds = 30 * 24 * 60 * 60; // 30 days
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Sign a 7-day JWT access token for persistent user session.
 */
export async function signAccessToken(user: { id: string; email?: string; role?: string }) {
  return new SignJWT({
    role: user.role || "student",
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(process.env.BETTER_AUTH_URL || "alma-network")
    .setAudience("alumni-api")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}

/**
 * Generate a 30-day refresh token stored in MongoDB under a token family.
 */
export async function generateRefreshToken(userId: string, family?: string): Promise<string> {
  await connectDB();
  const tokenFamily = family || randomBytes(24).toString("base64url");
  const plainToken = randomBytes(48).toString("base64url");
  await AuthRefreshToken.create({
    tokenHash: digest(plainToken),
    family: tokenFamily,
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + refreshSeconds * 1000),
    revokedAt: null,
  });
  return plainToken;
}

/**
 * Rotate a refresh token: revokes old token, handles replay detection, and issues new tokens.
 */
export async function rotateRefreshToken(token: string) {
  await connectDB();
  const tokenHash = digest(token);
  const record = await AuthRefreshToken.findOne({ tokenHash });

  if (!record || record.expiresAt <= new Date()) {
    return null;
  }

  // Replay-attack detection: If already revoked token is used, revoke the whole family
  if (record.revokedAt) {
    await AuthRefreshToken.updateMany(
      { family: record.family },
      { $set: { revokedAt: new Date() } }
    );
    return null;
  }

  // Revoke the current token
  record.revokedAt = new Date();
  await record.save();

  // Issue next token in the same family
  const nextPlainToken = randomBytes(48).toString("base64url");
  await AuthRefreshToken.create({
    tokenHash: digest(nextPlainToken),
    family: record.family,
    userId: record.userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + refreshSeconds * 1000),
    revokedAt: null,
  });

  const user = await User.findById(record.userId);
  if (!user) {
    return null;
  }

  const newAccessToken = await signAccessToken({
    id: String(user._id),
    email: user.email,
    role: user.role,
  });

  return {
    user,
    newAccessToken,
    newRefreshToken: nextPlainToken,
    userId: String(record.userId),
  };
}

export async function issueTokens(user: { id: string; role?: string; institutionId?: string; email?: string }) {
  const access = await signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refresh = await generateRefreshToken(user.id);
  return { access, refresh };
}

export async function rotateRefresh(token: string) {
  const result = await rotateRefreshToken(token);
  if (!result) return null;
  return { access: result.newAccessToken, refresh: result.newRefreshToken, userId: result.userId };
}

export async function revokeRefresh(token: string) {
  await connectDB();
  const tokenHash = digest(token);
  const record = await AuthRefreshToken.findOne({ tokenHash });
  if (record) {
    await AuthRefreshToken.updateMany({ family: record.family }, { $set: { revokedAt: new Date() } });
  }
}

export async function verifyAccess(token: string) {
  try {
    return (
      await jwtVerify(token, key(), {
        issuer: process.env.BETTER_AUTH_URL || "alma-network",
        audience: "alumni-api",
      })
    ).payload;
  } catch {
    return null;
  }
}

export function authCookies(access: string, refresh: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [
    `access_token=${access}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${accessSeconds}${secure}`,
    `refresh_token=${refresh}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${refreshSeconds}${secure}`,
  ];
}

export function clearAuthCookies() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [
    `access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`,
    `refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`,
  ];
}

export async function getUserById(id: string) {
  await connectDB();
  if (ObjectId.isValid(id)) {
    const user = await User.findById(id);
    if (user) return user;
  }
  return db.collection("user").findOne({ _id: id } as never);
}
