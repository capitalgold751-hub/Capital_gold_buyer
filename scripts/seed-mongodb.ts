import { COLLECTIONS, findFirst, getDocument, setDocument } from "../db";
import { ensureBaseData } from "../db/bootstrap";
import { hashPassword } from "../app/lib/mongodb-auth";
import type { AppointmentDocument, LeadDocument, RateEnquiryDocument, StaffUserDocument, UserRole } from "../db/schema";

const sampleMode = process.argv.includes("--sample");

async function ensureDemoUser(input: { email: string; name: string; role: UserRole; password: string }, now: string) {
  const email = input.email.toLowerCase();
  const existing = await findFirst<StaffUserDocument>(COLLECTIONS.users, {
    filters: [{ field: "email", op: "==", value: email }],
  });
  if (existing) return;
  const id = crypto.randomUUID();
  await setDocument<StaffUserDocument>(COLLECTIONS.users, id, {
    id,
    passwordHash: await hashPassword(input.password),
    sessionVersion: 1,
    email,
    name: input.name,
    role: input.role,
    isActive: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

async function createIfMissing<T extends { id: string }>(collectionName: string, id: string, document: T) {
  if (!await getDocument<T>(collectionName, id)) await setDocument(collectionName, id, document);
}

async function main() {
  await ensureBaseData();
  if (!sampleMode) {
    console.log("MongoDB production base data and initial account setup completed.");
    return;
  }

  const now = new Date();
  const iso = now.toISOString();
  const staffOneEmail = "staff1.demo@capitalgoldbuyers.in";
  const staffTwoEmail = "staff2.demo@capitalgoldbuyers.in";
  const demoUsers = [
    { email: "admin.demo@capitalgoldbuyers.in", name: "Demo Administrator", role: "admin" as const, password: "AdminDemo@12345" },
    { email: staffOneEmail, name: "Priya Follow-up", role: "staff" as const, password: "StaffOneDemo@12345" },
    { email: staffTwoEmail, name: "Arjun Follow-up", role: "staff" as const, password: "StaffTwoDemo@12345" },
  ];
  for (const user of demoUsers) await ensureDemoUser(user, iso);

  const leads: LeadDocument[] = [
    { id: "demo-lead-estimate", name: "Ananya Rao", phone: "+91 98765 41001", email: "ananya@example.com", source: "gold_estimate", branch: "Basaveshwara Nagar", status: "new", priority: "high", assignedTo: "", assignedName: "", assignedAt: null, notes: "Estimate unlocked for 22K jewellery. Admin assignment pending.", nextFollowUp: null, firstContactedAt: null, lastContactedAt: null, createdAt: iso, updatedAt: iso },
    { id: "demo-lead-contact", name: "Rahul Kumar", phone: "+91 98765 41002", email: "rahul@example.com", source: "contact_form", branch: "Basaveshwara Nagar", status: "contacted", priority: "normal", assignedTo: staffOneEmail, assignedName: "Priya Follow-up", assignedAt: iso, notes: "Customer asked about acceptable identity documents.", nextFollowUp: new Date(now.getTime() + 86_400_000).toISOString(), firstContactedAt: iso, lastContactedAt: iso, createdAt: iso, updatedAt: iso },
    { id: "demo-lead-appointment", name: "Meera Shah", phone: "+91 98765 41003", email: "meera@example.com", source: "appointment", branch: "Basaveshwara Nagar", status: "appointment_scheduled", priority: "high", assignedTo: staffTwoEmail, assignedName: "Arjun Follow-up", assignedAt: iso, notes: "Confirm parking directions before visit.", nextFollowUp: new Date(now.getTime() + 3_600_000).toISOString(), firstContactedAt: iso, lastContactedAt: iso, createdAt: iso, updatedAt: iso },
  ];
  for (const lead of leads) await createIfMissing(COLLECTIONS.leads, lead.id, lead);

  const appointment: AppointmentDocument = {
    id: "demo-appointment", leadId: "demo-lead-appointment", name: "Meera Shah", phone: "+91 98765 41003", email: "meera@example.com", branch: "Basaveshwara Nagar", appointmentDate: new Date(now.getTime() + 2 * 86_400_000).toISOString().slice(0, 10), timeSlot: "12:00 PM", status: "approved", assignedTo: staffTwoEmail, assignedName: "Arjun Follow-up", customerNote: "Please confirm parking availability.", staffNote: "Phone confirmation pending.", createdAt: iso, updatedAt: iso,
  };
  await createIfMissing(COLLECTIONS.appointments, appointment.id, appointment);

  const enquiry: RateEnquiryDocument = { id: "demo-rate-enquiry", name: "Ananya Rao", phone: "+91 98765 41001", branch: "Basaveshwara Nagar", source: "gold_estimate", consent: true, status: "new", createdAt: iso };
  await createIfMissing(COLLECTIONS.rateEnquiries, enquiry.id, enquiry);

  console.log("MongoDB sample accounts and data created idempotently.");
  console.log("Demo admin: admin.demo@capitalgoldbuyers.in / AdminDemo@12345");
  console.log("Demo staff 1: staff1.demo@capitalgoldbuyers.in / StaffOneDemo@12345");
  console.log("Demo staff 2: staff2.demo@capitalgoldbuyers.in / StaffTwoDemo@12345");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
