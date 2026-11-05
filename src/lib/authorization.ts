import { currentUser } from "@/lib/auth-security";

export async function authorize(request: Request, input: {
  roles?: string[];
  institutionId?: string;
  ownerId?: string;
  relationshipUserIds?: string[];
}) {
  const context = await currentUser(request);
  if (!context) return { allowed: false, status: 401 as const };
  const user = context.user as unknown as { _id: unknown; role?: string; institutionId?: string };
  const role = user.role || "student";
  if (input.roles && !input.roles.includes(role)) return { allowed: false, status: 403 as const };
  if (input.institutionId && input.institutionId !== user.institutionId && !["administrator", "admin"].includes(role)) return { allowed: false, status: 403 as const };
  const userId = String(user._id);
  if (input.ownerId && input.ownerId !== userId) return { allowed: false, status: 403 as const };
  if (input.relationshipUserIds && !input.relationshipUserIds.includes(userId)) return { allowed: false, status: 403 as const };
  return { allowed: true, user: { ...user, _id: userId }, role };
}
