import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoleLoginForm } from "../components/RoleLoginForm";
import { getDashboardIdentity } from "../lib/dashboard-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staff Login", robots: { index: false, follow: false } };

export default async function StaffLoginPage() {
  const identity = await getDashboardIdentity().catch(() => null);
  if (identity?.role === "staff") redirect("/dashboard");
  return <RoleLoginForm role="staff" />;
}
