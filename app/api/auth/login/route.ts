import { NextResponse } from "next/server";
import { COLLECTIONS, findFirst, updateDocument } from "../../../../db";
import type { StaffUserDocument, UserRole } from "../../../../db/schema";
import { verifyPassword } from "../../../lib/mongodb-auth";
import { attachSessionCookie, createSessionToken } from "../../../lib/session";
import { limitLogin, RateLimitError } from "../../../lib/rate-limit";
import { assertSameOrigin } from "../../../lib/request-security";
import { cleanText, safeError, validateEmail } from "../../../lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = (await request.json()) as Record<string, unknown>;
    const email = validateEmail(body.email, true);
    const password = typeof body.password === "string" ? body.password : "";
    const expectedRole = cleanText(body.role, 10) as UserRole;

    if (!["admin", "staff"].includes(expectedRole)) throw new Error("Choose a valid login role.");
    await limitLogin(request, email);

    const user = await findFirst<StaffUserDocument>(COLLECTIONS.users, {
      filters: [{ field: "email", op: "==", value: email.toLowerCase() }],
    });

    const valid = Boolean(user?.passwordHash) && await verifyPassword(password, user!.passwordHash);
    if (!user || !valid || !user.isActive || user.role !== expectedRole) {
      return NextResponse.json(
        { error: "Email, password or selected role is incorrect." },
        { status: 401, headers: { "cache-control": "no-store" } },
      );
    }

    const now = new Date().toISOString();
    await updateDocument(COLLECTIONS.users, user.id, { lastLoginAt: now, updatedAt: now });
    const token = createSessionToken({
      userId: user.id,
      email: user.email.toLowerCase(),
      role: user.role,
      sessionVersion: user.sessionVersion || 1,
    });

    const response = NextResponse.json({ success: true, role: user.role, redirectTo: "/dashboard" });
    attachSessionCookie(response, token);
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    console.error("[AUTH LOGIN ERROR]", error);
    return NextResponse.json(
      { error: safeError(error) },
      { status: error instanceof RateLimitError ? 429 : 400, headers: { "cache-control": "no-store" } },
    );
  }
}
