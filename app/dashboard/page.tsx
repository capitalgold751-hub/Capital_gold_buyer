import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardClient } from "../components/DashboardClient";
import { getDashboardIdentity } from "../lib/dashboard-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staff & Admin Dashboard", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const identity = await getDashboardIdentity().catch(() => null);
  if (!identity) redirect("/login?returnTo=/dashboard");
  return <DashboardClient
    initialUser={{ displayName: identity.user.displayName, email: identity.user.email, role: identity.role }}
    signOutHref="/api/auth/logout?returnTo=/"
  />;
}
