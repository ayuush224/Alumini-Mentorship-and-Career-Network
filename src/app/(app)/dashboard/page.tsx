import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/app-tokens";


export default async function DashboardPage() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccess(token);
      if (
        payload?.role === "alumni" ||
        payload?.role === "mentor" ||
        payload?.role === "alumni_mentor"
      ) {
        redirect("/mentor/dashboard");
      }
      if (payload?.role === "alumni_relations_officer") {
        redirect("/officer");
      }
      if (payload?.role === "administrator" || payload?.role === "placement_officer") {
        redirect("/officer");
      }
      if (payload?.sub) {
        redirect("/student/dashboard");
      }
    }
  } catch (err) {
    // If NEXT_REDIRECT, rethrow
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
  }

  redirect("/login");
}
