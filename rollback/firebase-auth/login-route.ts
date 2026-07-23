import { NextResponse } from "next/server";
import { getFirebaseAuth } from "../../../../db";
import type { UserRole } from "../../../../db/schema";
import { cleanText, safeError, validateEmail } from "../../../lib/validation";
import { FirebasePasswordError, signInWithFirebasePassword } from "../../../lib/firebase-auth";
import { attachSessionCookie, sessionLifetimeMs } from "../../../lib/session";
import { limitLogin, RateLimitError } from "../../../lib/rate-limit";
import { assertSameOrigin } from "../../../lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function withTimeout<T>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out.`)), milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function configuredRoleForEmail(email: string): UserRole | null {
  const normalized = email.trim().toLowerCase();
  if (process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() === normalized) return "admin";
  if (process.env.INITIAL_STAFF_1_EMAIL?.trim().toLowerCase() === normalized) return "staff";
  if (process.env.INITIAL_STAFF_2_EMAIL?.trim().toLowerCase() === normalized) return "staff";
  return null;
}

export async function POST(request: Request) {
  let attemptedEmail = "unknown";
  let expectedRole: UserRole | "" = "";

  try {
    assertSameOrigin(request);
    const body = (await request.json()) as Record<string, unknown>;
    attemptedEmail = validateEmail(body.email, true);
    const password = typeof body.password === "string" ? body.password : "";
    expectedRole = cleanText(body.role, 10) as UserRole;

    if (!["admin", "staff"].includes(expectedRole)) {
      throw new Error("Choose a valid login role.");
    }

    try {
      await withTimeout(
        limitLogin(request, attemptedEmail),
        2_500,
        "Login rate-limit check",
      );
    } catch (rateLimitError) {
      if (rateLimitError instanceof RateLimitError) throw rateLimitError;
      console.error("[LOGIN RATE LIMIT SKIPPED]", rateLimitError);
    }

    let credential;
    try {
      credential = await signInWithFirebasePassword(attemptedEmail, password);
    } catch (error) {
      throw error;
    }

    const auth = getFirebaseAuth();
    const decoded = await withTimeout(
      auth.verifyIdToken(credential.idToken),
      10_000,
      "Firebase token verification",
    );

    if (!decoded.auth_time || Math.floor(Date.now() / 1000) - decoded.auth_time > 5 * 60) {
      return NextResponse.json(
        { error: "Please sign in again to create a fresh secure session." },
        { status: 401 },
      );
    }

    const claimRole = decoded.role as UserRole | undefined;
    const configuredRole = configuredRoleForEmail(attemptedEmail);
    const effectiveRole = claimRole || configuredRole;

    if (!effectiveRole || effectiveRole !== expectedRole) {
      return NextResponse.json(
        { error: "Email, password or selected role is incorrect." },
        { status: 401 },
      );
    }

    if (claimRole !== effectiveRole) {
      await withTimeout(
        auth.setCustomUserClaims(credential.localId, { role: effectiveRole }),
        10_000,
        "Firebase role setup",
      );
      return NextResponse.json(
        { error: "Your secure role was configured. Please sign in once more." },
        { status: 409 },
      );
    }

    const sessionCookie = await withTimeout(
      auth.createSessionCookie(credential.idToken, {
        expiresIn: sessionLifetimeMs(),
      }),
      10_000,
      "Firebase session creation",
    );

    const response = NextResponse.json({
      success: true,
      role: effectiveRole,
      redirectTo: "/dashboard",
    });
    attachSessionCookie(response, sessionCookie);
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    console.error("[AUTH LOGIN ERROR]", error);
    const status =
      error instanceof RateLimitError
        ? 429
        : error instanceof FirebasePasswordError
          ? error.configurationError
            ? 503
            : 401
          : 400;

    return NextResponse.json(
      { error: safeError(error) },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
