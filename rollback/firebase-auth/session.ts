import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getFirebaseAuth } from "../../db";
import type { UserRole } from "../../db/schema";

export const SESSION_COOKIE = "cgb_session";

export type SessionPayload = {
  userId: string;
  email: string;
  role: UserRole;
};

export function sessionLifetimeMs() {
  const configuredHours = Number(process.env.SESSION_HOURS || 12);
  const hours = Number.isFinite(configuredHours) ? Math.min(72, Math.max(1, configuredHours)) : 12;
  return hours * 60 * 60 * 1000;
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await getFirebaseAuth().verifySessionCookie(cookie, true);
    const role = decoded.role as UserRole | undefined;
    if (!decoded.uid || !decoded.email || !role || !["admin", "staff"].includes(role)) return null;
    return { userId: decoded.uid, email: decoded.email.toLowerCase(), role };
  } catch {
    return null;
  }
}

export function attachSessionCookie(response: NextResponse, sessionCookie: string) {
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(sessionLifetimeMs() / 1000),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
