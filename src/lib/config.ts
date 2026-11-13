import fs from "fs";
import path from "path";
import { z } from "zod";

/**
 * Ensures .env.local or .env variables are loaded if executing in standalone scripts or tests
 * before Next.js runtime automatically populates process.env.
 */
function loadEnvIfUnset() {
  if (!process.env.MONGODB_URI && typeof process !== "undefined" && process.cwd) {
    try {
      const candidates = [".env.local", ".env"];
      for (const file of candidates) {
        const envPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), file);
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
                if (process.env[key] === undefined) {
                  process.env[key] = val;
                }
              }
            }
          }
        }
      }
    } catch {
      // Ignore file reading errors if executed in an environment without file access
    }
  }
}

loadEnvIfUnset();

/**
 * Strict threshold validator for integers > 0.
 * Fails if absent from environment or fails type parsing (e.g. non-numeric, negative, float).
 */
const thresholdValidator = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") {
    return undefined;
  }
  const num = Number(val);
  return Number.isNaN(num) || !Number.isInteger(num) || num <= 0 ? "INVALID_NUMBER" : num;
}, z
  .number()
  .int("Threshold must be an integer")
  .positive("Threshold must be a positive integer greater than 0"));

/**
 * Positive integer validator with fallback default for optional cache/rate limit intervals.
 */
const defaultPositiveIntValidator = (defaultValue: number) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === "") {
      return defaultValue;
    }
    const num = Number(val);
    return Number.isNaN(num) || !Number.isInteger(num) || num <= 0 ? defaultValue : num;
  }, z.number().int().positive());

export const configSchema = z
  .object({
    MAX_MENTEES_PER_MENTOR: thresholdValidator,
    MAX_MENTORS_PER_STUDENT: thresholdValidator,
    MAX_PENDING_REQUESTS_PER_STUDENT: thresholdValidator,
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required").optional().default(process.env.MONGODB_URI || ""),
    BETTER_AUTH_SECRET: z.string().optional().default(process.env.BETTER_AUTH_SECRET || "default_development_secret_change_me"),
    BETTER_AUTH_URL: z.string().optional().default(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
    AUTH_TRUSTED_ORIGINS: z.string().optional().default(process.env.AUTH_TRUSTED_ORIGINS || "http://localhost:3000"),
    // Upstash Redis & Time Intervals
    UPSTASH_REDIS_REST_URL: z.string().optional().default(process.env.UPSTASH_REDIS_REST_URL || ""),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(process.env.UPSTASH_REDIS_REST_TOKEN || ""),
    REDIS_OTP_TTL_SECONDS: defaultPositiveIntValidator(600),
    AUTH_RATE_LIMIT_WINDOW_SECONDS: defaultPositiveIntValidator(120),
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: defaultPositiveIntValidator(5),
    REDIS_MENTORS_CACHE_TTL_SECONDS: defaultPositiveIntValidator(600),
    REDIS_OFFICER_DASHBOARD_CACHE_TTL_SECONDS: defaultPositiveIntValidator(180),
    REDIS_STUDENT_ANALYTICS_CACHE_TTL_SECONDS: defaultPositiveIntValidator(900),
  })
  .strict();

export type AppConfig = z.infer<typeof configSchema>;

/**
 * Validates configuration thresholds and environment parameters.
 * Throws a fatal initialization error if thresholds are missing or invalid.
 */
export function validateConfig(): AppConfig {
  const rawInput = {
    MAX_MENTEES_PER_MENTOR: process.env.MAX_MENTEES_PER_MENTOR,
    MAX_MENTORS_PER_STUDENT: process.env.MAX_MENTORS_PER_STUDENT,
    MAX_PENDING_REQUESTS_PER_STUDENT: process.env.MAX_PENDING_REQUESTS_PER_STUDENT,
    MONGODB_URI: process.env.MONGODB_URI,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTH_TRUSTED_ORIGINS: process.env.AUTH_TRUSTED_ORIGINS,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    REDIS_OTP_TTL_SECONDS: process.env.REDIS_OTP_TTL_SECONDS,
    AUTH_RATE_LIMIT_WINDOW_SECONDS: process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
    REDIS_MENTORS_CACHE_TTL_SECONDS: process.env.REDIS_MENTORS_CACHE_TTL_SECONDS,
    REDIS_OFFICER_DASHBOARD_CACHE_TTL_SECONDS: process.env.REDIS_OFFICER_DASHBOARD_CACHE_TTL_SECONDS,
    REDIS_STUDENT_ANALYTICS_CACHE_TTL_SECONDS: process.env.REDIS_STUDENT_ANALYTICS_CACHE_TTL_SECONDS,
  };

  const result = configSchema.safeParse(rawInput);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    const fatalMessage =
      `\n=======================================================\n` +
      `[CONFIG FATAL ERROR] Invalid or missing system thresholds in environment:\n` +
      `${errorMessages}\n` +
      `Server initialization aborted. Please check your .env configuration.\n` +
      `=======================================================\n`;

    console.error(fatalMessage);
    throw new Error(fatalMessage);
  }

  return result.data;
}

export const config: AppConfig = validateConfig();

export const {
  MAX_MENTEES_PER_MENTOR,
  MAX_MENTORS_PER_STUDENT,
  MAX_PENDING_REQUESTS_PER_STUDENT,
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
  REDIS_OTP_TTL_SECONDS,
  AUTH_RATE_LIMIT_WINDOW_SECONDS,
  AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  REDIS_MENTORS_CACHE_TTL_SECONDS,
  REDIS_OFFICER_DASHBOARD_CACHE_TTL_SECONDS,
  REDIS_STUDENT_ANALYTICS_CACHE_TTL_SECONDS,
} = config;

export default config;
