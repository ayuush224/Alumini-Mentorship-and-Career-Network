import { getAuth } from "@/lib/auth";
import { authCookies, issueTokens } from "@/lib/app-tokens";
import { checkRequest, rateLimit } from "@/lib/auth-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await rateLimit(request, 10)) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!checkRequest(request)) return Response.json({ error: "CSRF or origin validation failed" }, { status: 403 });
  const identity = await getAuth().api.getSession({ headers: request.headers });
  if (!identity) return Response.json({ error: "Authentication required" }, { status: 401 });
  const user = identity.user as typeof identity.user & { role?: string; institutionId?: string; twoFactorEnabled?: boolean };
  if (["administrator", "admin"].includes(user.role || "") && !user.twoFactorEnabled) {
    return Response.json({ error: "Administrator TOTP enrollment required" }, { status: 403 });
  }
  const tokens = await issueTokens(user);
  const response = new Response(null, { status: 204 });
  for (const cookie of authCookies(tokens.access, tokens.refresh)) response.headers.append("set-cookie", cookie);
  return response;
}
