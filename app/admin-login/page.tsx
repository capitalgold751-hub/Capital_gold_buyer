import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoleLoginForm } from "../components/RoleLoginForm";
import { getDashboardIdentity } from "../lib/dashboard-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Login", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const identity = await getDashboardIdentity().catch(() => null);
  if (identity?.role === "admin") redirect("/dashboard");
  return <RoleLoginForm role="admin" />;
}
