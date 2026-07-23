import { COLLECTIONS, setDocument } from "../../../db";
import type { LeadDocument } from "../../../db/schema";
import { notifyAdmins } from "../../lib/business-notifications";
import { limitSubmission, RateLimitError } from "../../lib/rate-limit";
import { isConsentAccepted } from "../../lib/request-security";
import { cleanText, normalizeIndianPhone, safeError, validateEmail, validateName } from "../../lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (cleanText(body.company)) return Response.json({ success: true }, { status: 201 });
    const name = validateName(body.name);
    const phone = normalizeIndianPhone(body.phone);
    const email = validateEmail(body.email);
    const message = cleanText(body.message, 600);
    if (!message) throw new Error("Tell us how we can help.");
    if (!isConsentAccepted(body.consent)) throw new Error("Please accept the enquiry consent to continue.");
    await limitSubmission(request, phone, "contact");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await setDocument<LeadDocument>(COLLECTIONS.leads, id, {
      id, name, phone, email, source: "contact_form", branch: "Basaveshwara Nagar", status: "new", priority: "high",
      assignedTo: "", assignedName: "", assignedAt: null, notes: message, nextFollowUp: null,
      firstContactedAt: null, lastContactedAt: null, createdAt: now, updatedAt: now,
    });
    await notifyAdmins({ type: "contact", title: "New website enquiry", message: `${name} (${phone}) submitted a website enquiry and is waiting for assignment.`, entityId: id });
    return Response.json({ success: true, leadId: id, message: "Thanks. Your enquiry is with our admin team for assignment." }, { status: 201 });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: error instanceof RateLimitError ? 429 : 400 });
  }
}
