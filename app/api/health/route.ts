import { pingFirestore } from "../../../db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingFirestore();
    return Response.json({
      status: "ok",
      database: "connected",
      goldApi: process.env.GOLDAPI_KEY ? "configured" : "manual-rate-fallback",
      email: process.env.SMTP_PASS || process.env.RESEND_API_KEY ? "configured" : "dashboard-notifications-only",
      time: new Date().toISOString(),
    }, { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });
  } catch {
    return Response.json({ status: "error", database: "unavailable", time: new Date().toISOString() }, { status: 503, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });
  }
}
