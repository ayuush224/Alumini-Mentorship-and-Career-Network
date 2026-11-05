import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { checkOrigin, rateLimit } from "@/lib/auth-security";

export const runtime = "nodejs";
const input = z.object({ email: z.email(), otp: z.string().regex(/^\d{6}$/) }).strict();

export async function POST(request: Request) {
  if (!await rateLimit(request, 5)) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!checkOrigin(request)) return Response.json({ error: "Origin validation failed" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid verification details" }, { status: 400 });
  try {
    await getAuth().api.verifyEmailOTP({ body: parsed.data, headers: request.headers });
    return Response.json({ message: "Email verified. You can now sign in." });
  } catch {
    return Response.json({ error: "Invalid or expired verification code" }, { status: 400 });
  }
}
