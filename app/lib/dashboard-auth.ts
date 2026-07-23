import type { UserRole } from "../../db/schema";
import { readSession } from "./session";

export type DashboardRole = UserRole;

export async function getDashboardIdentity() {
  const session = await readSession();
  if (!session) return null;
  const displayName = session.email.split("@")[0] || "User";
  return {
    user: { displayName, fullName: displayName, email: session.email, id: session.userId },
    role: session.role,
  };
}

export function requireRole(actual: UserRole, required: UserRole) {
  if (required === "admin" && actual !== "admin") throw new ForbiddenActionError("Only administrators can perform this action.");
}

export class ForbiddenActionError extends Error {}
