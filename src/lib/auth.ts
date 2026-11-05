import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { Resend } from "resend";

const required = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};

let client: MongoClient | undefined;
export const db = {
  collection: (name: string) => {
    client ??= new MongoClient(required("MONGODB_URI"));
    return client.db(process.env.MONGODB_DB || "alumni_network").collection(name);
  },
} as ReturnType<MongoClient["db"]>;
const sendEmail = async (input: Parameters<Resend["emails"]["send"]>[0]) => {
  const resend = new Resend(required("RESEND_API_KEY"));
  return resend.emails.send(input);
};

function createAuth() {
  return betterAuth({
  appName: "Alumni Mentorship Network",
  baseURL: required("BETTER_AUTH_URL"),
  secret: required("BETTER_AUTH_SECRET"),
  database: mongodbAdapter(db),
  trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS || "").split(",").filter(Boolean),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: { sendOnSignUp: true },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "student", input: false },
      institutionId: { type: "string", required: false, input: false },
    },
  },
  session: { expiresIn: 7 * 24 * 60 * 60, updateAge: 24 * 60 * 60, cookieCache: { enabled: false } },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      disableSignUp: true,
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: true,
      storeOTP: "hashed",
      rateLimit: { window: 60, max: 3 },
      async sendVerificationOTP({ email, otp, type }) {
        const { error } = await sendEmail({
          from: required("RESEND_FROM_EMAIL"),
          to: [email],
          subject: "Your Alumni Network verification code",
          text: `Your ${type === "sign-in" ? "sign-in" : "verification"} code is ${otp}. It expires in 5 minutes.`,
        });
        if (error) throw new Error("Unable to send verification email");
      },
    }),
    twoFactor({
      issuer: "Alumni Mentorship Network",
      allowPasswordless: true,
      totpOptions: { digits: 6, period: 30 },
      otpOptions: { sendOTP: async ({ user, otp }) => {
        const { error } = await sendEmail({
          from: required("RESEND_FROM_EMAIL"), to: [user.email],
          subject: "Your administrator sign-in code", text: `Your one-time code is ${otp}.`,
        });
        if (error) throw new Error("Unable to send verification email");
      } },
    }),
  ],
  databaseHooks: {
    user: { create: { before: async (user) => ({ data: { ...user, role: process.env.DEFAULT_USER_ROLE || "student" } }) } },
  },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  if (!instance) instance = createAuth();
  return instance;
}
