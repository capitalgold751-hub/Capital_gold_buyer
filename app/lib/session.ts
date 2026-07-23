import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { COLLECTIONS, getDocument } from "../../db";
import type { StaffUserDocument, UserRole } from "../../db/schema";

export const SESSION_COOKIE = "cgb_session";

export type SessionPayload = {
  userId: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
  expiresAt: number;
};

export function sessionLifetimeMs() {
  const configuredHours = Number(process.env.SESSION_HOURS || 12);
  const hours = Number.isFinite(configuredHours) ? Math.min(72, Math.max(1, configuredHours)) : 12;
  return hours * 60 * 60 * 1000;
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", sessionSecret()).update(encodedPayload).digest("base64url");
}

export function createSessionToken(input: Omit<SessionPayload, "expiresAt">) {
  const payload: SessionPayload = { ...input, expiresAt: Date.now() + sessionLifetimeMs() };
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded)}`;
}

function decodeAndVerify(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = Buffer.from(sign(encoded));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !payload.email || !["admin", "staff"].includes(payload.role)) return null;
    if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = decodeAndVerify(token);
  if (!payload) return null;

  const user = await getDocument<StaffUserDocument>(COLLECTIONS.users, payload.userId);
  if (!user || !user.isActive || user.email.toLowerCase() !== payload.email.toLowerCase()) return null;
  if (user.role !== payload.role || user.sessionVersion !== payload.sessionVersion) return null;
  return payload;
}

export function attachSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
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
