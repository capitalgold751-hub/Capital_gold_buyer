import { COLLECTIONS, setDocument } from "../../../db";
import type { AnalyticsEventDocument } from "../../../db/schema";
import { assertSameOrigin } from "../../lib/request-security";
import { cleanText } from "../../lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedEvents = new Set([
  "page_view",
  "gold_rate_unlocked",
  "calculator_used",
  "appointment_requested",
  "contact_submitted",
  "click_call",
  "click_whatsapp",
]);

function noStore(status = 204) {
  return new Response(null, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return noStore(415);

    const body = (await request.json()) as Record<string, unknown>;
    const eventName = cleanText(body.eventName, 50);
    const sessionId = cleanText(body.sessionId, 100);

    if (!allowedEvents.has(eventName)) return noStore(400);
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(sessionId)) return noStore(400);

    const pagePath = cleanText(body.pagePath, 240) || "/";
    const referrerHost = cleanText(body.referrerHost, 160) || "direct";
    const campaign = cleanText(body.campaign, 120) || "organic";
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await setDocument<AnalyticsEventDocument>(COLLECTIONS.analyticsEvents, id, {
      id,
      eventName,
      sessionId,
      pagePath: pagePath.startsWith("/") ? pagePath : "/",
      referrerHost,
      campaign,
      createdAt: now,
    });

    return noStore();
  } catch (error) {
    // Analytics must never interrupt the customer journey.
    console.error("POST /api/analytics failed:", error);
    return noStore(204);
  }
}
