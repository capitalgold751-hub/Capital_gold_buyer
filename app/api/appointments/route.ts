import { COLLECTIONS, setDocument } from "../../../db";
import type { AppointmentDocument, LeadDocument } from "../../../db/schema";
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
    const branch = cleanText(body.branch, 80) || "Basaveshwara Nagar";
    const appointmentDate = cleanText(body.appointmentDate, 10);
    const timeSlot = cleanText(body.timeSlot, 30);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || appointmentDate < new Date().toISOString().slice(0, 10)) throw new Error("Choose a valid present or future appointment date.");
    if (!timeSlot) throw new Error("Select an appointment time.");
    if (!isConsentAccepted(body.consent)) throw new Error("Please accept the appointment consent to continue.");
    await limitSubmission(request, phone, "appointment");
    const leadId = crypto.randomUUID();
    const appointmentId = crypto.randomUUID();
    const now = new Date().toISOString();
    await Promise.all([
      setDocument<LeadDocument>(COLLECTIONS.leads, leadId, {
        id: leadId, name, phone, email, source: "appointment", branch, status: "appointment_scheduled", priority: "urgent",
        assignedTo: "", assignedName: "", assignedAt: null, notes: "Appointment requested online.", nextFollowUp: appointmentDate,
        firstContactedAt: null, lastContactedAt: null, createdAt: now, updatedAt: now,
      }),
      setDocument<AppointmentDocument>(COLLECTIONS.appointments, appointmentId, {
        id: appointmentId, leadId, name, phone, email, branch, appointmentDate, timeSlot, status: "pending",
        assignedTo: "", assignedName: "", customerNote: cleanText(body.note, 300), staffNote: "", createdAt: now, updatedAt: now,
      }),
    ]);
    await notifyAdmins({ type: "appointment", title: "New appointment request", message: `${name} (${phone}) requested ${appointmentDate} at ${timeSlot}. Assign a staff follow-up.`, entityId: appointmentId });
    return Response.json({ success: true, appointmentId, message: "Appointment received by admin. Our team will confirm it shortly." }, { status: 201 });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: error instanceof RateLimitError ? 429 : 400 });
  }
}
