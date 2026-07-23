import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../lib/session";

function safeReturnTo(request: Request) {
  const value = new URL(request.url).searchParams.get("returnTo") || "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function logout(request: Request) {
  const response = NextResponse.redirect(new URL(safeReturnTo(request), request.url), 303);
  clearSessionCookie(response);
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function GET(request: Request) { return logout(request); }
export async function POST(request: Request) { return logout(request); }
