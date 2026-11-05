import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { authCookies, issueTokens } from "@/lib/app-tokens";
import { checkOrigin, rateLimit } from "@/lib/auth-security";

export const runtime = "nodejs";
const input = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();

export async function POST(request: Request) {
  if (!await rateLimit(request, 5)) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!checkOrigin(request)) return Response.json({ error: "Origin validation failed" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid TOTP code" }, { status: 400 });
  try {
    const result = await getAuth().api.verifyTOTP({ body: parsed.data, headers: request.headers, asResponse: true });
    const data = await result.json();
    const user = data.user as { id: string; role?: string; institutionId?: string };
    const tokens = await issueTokens(user);
    const response = Response.json({ message: "Signed in." });
    for (const cookie of result.headers.getSetCookie()) response.headers.append("set-cookie", cookie);
    for (const cookie of authCookies(tokens.access, tokens.refresh)) response.headers.append("set-cookie", cookie);
    return response;
  } catch {
    return Response.json({ error: "Invalid or expired TOTP challenge" }, { status: 401 });
  }
}
