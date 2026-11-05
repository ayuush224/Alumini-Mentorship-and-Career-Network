import { getUserById, verifyAccess } from "@/lib/app-tokens";
import { csrfToken } from "@/lib/auth-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)access_token=([^;]+)/)?.[1];
  const payload = token && await verifyAccess(token);
  if (typeof payload?.sub !== "string") return Response.json({ error: "Authentication required" }, { status: 401 });
  const user = await getUserById(payload.sub);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const response = Response.json({ id: String(user._id), role: user.role || "student", institutionId: user.institutionId });
  const csrf = csrfToken();
  response.headers.append("Set-Cookie", `csrf_token=${csrf}; Path=/; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  response.headers.set("X-CSRF-Token", csrf);
  return response;
}
