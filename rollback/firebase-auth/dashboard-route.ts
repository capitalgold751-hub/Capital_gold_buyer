import {
  COLLECTIONS,
  findFirst,
  getDocument,
  getFirebaseAuth,
  listDocuments,
  setDocument,
  updateDocument,
  updateDocuments,
} from "../../../db";
import type {
  AppointmentDocument,
  BlogPostDocument,
  BranchDocument,
  GoldRateDocument,
  LeadDocument,
  StaffUserDocument,
} from "../../../db/schema";
import { appointmentStatuses, leadStatuses } from "../../lib/site-config";
import { ForbiddenActionError, getDashboardIdentity, requireRole } from "../../lib/dashboard-auth";
import { validatePasswordStrength } from "../../lib/password";
import { signInWithFirebasePassword } from "../../lib/firebase-auth";
import { assertSameOrigin } from "../../lib/request-security";
import { notifyAllActiveUsers, notifyAssignedStaff } from "../../lib/business-notifications";
import { syncLiveGoldRates } from "../../lib/gold-rate-service";
import { cleanText, safeError, slugify, validateEmail, validateName } from "../../lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const privateHeaders = {
  "cache-control": "no-store, private",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
};

function privateJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: privateHeaders });
}

async function authorized() {
  try { return await getDashboardIdentity(); } catch { return null; }
}


async function activeStaffByEmail(email: string) {
  const staff = await findFirst<StaffUserDocument>(COLLECTIONS.users, {
    filters: [{ field: "email", op: "==", value: email }],
  });
  return staff?.role === "staff" && staff.isActive ? staff : null;
}

async function profileByEmail(email: string) {
  return findFirst<StaffUserDocument>(COLLECTIONS.users, { filters: [{ field: "email", op: "==", value: email }] });
}

export async function GET(request: Request) {
  const identity = await authorized();
  if (!identity) return privateJson({ error: "Dashboard access is restricted." }, 403);

  try {
    const isAdmin = identity.role === "admin";
    const email = identity.user.email.toLowerCase();
    const section = new URL(request.url).searchParams.get("section") || "Overview";

    const needsLeads = ["Overview", "Leads", "Analytics"].includes(section);
    const needsAppointments = ["Overview", "Appointments"].includes(section);
    const needsRates = isAdmin && ["Overview", "Gold Rates"].includes(section);
    const needsStaff = isAdmin && ["Leads", "Appointments", "Staff"].includes(section);
    const needsBranches = isAdmin && section === "Branches";
    const needsBlogs = isAdmin && section === "Blog CMS";

    const [rateRows, leadRows, appointmentRows, branchRows, blogRows, staffRows] = await Promise.all([
      needsRates
        ? listDocuments<GoldRateDocument>(COLLECTIONS.goldRates, {
            orderBy: { field: "updatedAt", direction: "desc" }, limit: 4,
          })
        : Promise.resolve([]),
      needsLeads
        ? listDocuments<LeadDocument>(COLLECTIONS.leads, {
            filters: isAdmin ? [] : [{ field: "assignedTo", op: "==", value: email }],
            orderBy: { field: "updatedAt", direction: "desc" }, limit: 75,
          })
        : Promise.resolve([]),
      needsAppointments
        ? listDocuments<AppointmentDocument>(COLLECTIONS.appointments, {
            filters: isAdmin ? [] : [{ field: "assignedTo", op: "==", value: email }],
            orderBy: { field: "createdAt", direction: "desc" }, limit: 50,
          })
        : Promise.resolve([]),
      needsBranches
        ? listDocuments<BranchDocument>(COLLECTIONS.branches, {
            orderBy: { field: "updatedAt", direction: "desc" }, limit: 20,
          })
        : Promise.resolve([]),
      needsBlogs
        ? listDocuments<BlogPostDocument>(COLLECTIONS.blogPosts, {
            orderBy: { field: "updatedAt", direction: "desc" }, limit: 20,
          })
        : Promise.resolve([]),
      needsStaff
        ? listDocuments<StaffUserDocument>(COLLECTIONS.users, {
            orderBy: { field: "createdAt", direction: "desc" }, limit: 30,
          })
        : Promise.resolve([]),
    ]);

    const enquiryRows = leadRows
      .filter((lead) => lead.source.includes("gold_rate") || lead.source.includes("gold_estimate"))
      .slice(0, 30)
      .map((lead) => ({ id: lead.id, name: lead.name, phone: lead.phone, branch: lead.branch, source: lead.source, status: lead.status, createdAt: lead.createdAt }));
    const today = new Date().toISOString().slice(0, 10);

    return privateJson({
      generatedAt: new Date().toISOString(),
      currentUser: { displayName: identity.user.displayName, email, role: identity.role },
      stats: {
        totalLeads: leadRows.length,
        newLeads: leadRows.filter((lead) => lead.status === "new").length,
        rateEnquiries: enquiryRows.length,
        convertedLeads: leadRows.filter((lead) => lead.status === "converted").length,
        pendingAppointments: appointmentRows.filter((item) => item.status === "pending").length,
        upcomingAppointments: appointmentRows.filter((item) => item.appointmentDate >= today && !["cancelled", "completed"].includes(item.status)).length,
        unreadNotifications: 0,
        pageViews: 0,
        uniqueVisitors: 0,
      },
      rates: rateRows,
      enquiries: enquiryRows,
      leads: leadRows,
      appointments: appointmentRows,
      branches: branchRows,
      blogs: blogRows,
      staff: staffRows.map((user) => ({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt, updatedAt: user.updatedAt })),
      notifications: [], auditLogs: [], analytics: [], quotaMode: "minimal", loadedSection: section,
    });
  } catch (error) {
    console.error("[DASHBOARD API ERROR]", error);
    return privateJson({ error: safeError(error) }, 500);
  }
}

export async function POST(request: Request) {
  const identity = await authorized();
  if (!identity) return privateJson({ error: "Dashboard access is restricted." }, 403);
  try {
    assertSameOrigin(request);
    const body = await request.json() as Record<string, unknown>;
    const action = cleanText(body.action, 50);
    const now = new Date().toISOString();
    const email = identity.user.email.toLowerCase();
    let responseData: Record<string, unknown> = { success: true };

    if (action === "update_lead") {
      const id = cleanText(body.id, 100);
      const status = cleanText(body.status, 40) as LeadDocument["status"];
      if (!leadStatuses.includes(status)) throw new Error("Invalid lead status.");
      const lead = await getDocument<LeadDocument>(COLLECTIONS.leads, id);
      if (!lead) throw new Error("Lead was not found.");
      if (identity.role === "staff" && lead.assignedTo !== email) throw new ForbiddenActionError("This lead is not assigned to your account.");
      const notes = cleanText(body.notes, 2000);
      const nextFollowUp = cleanText(body.nextFollowUp, 30) || null;
      const firstContactedAt = lead.firstContactedAt || (status !== "new" ? now : null);
      await updateDocument(COLLECTIONS.leads, id, { status, notes, nextFollowUp, firstContactedAt, lastContactedAt: status !== "new" ? now : lead.lastContactedAt, updatedAt: now });
    } else if (action === "assign_lead") {
      requireRole(identity.role, "admin");
      const id = cleanText(body.id, 100);
      const assignedTo = cleanText(body.assignedTo, 120).toLowerCase();
      const lead = await getDocument<LeadDocument>(COLLECTIONS.leads, id);
      if (!lead) throw new Error("Lead was not found.");
      const staff = assignedTo ? await activeStaffByEmail(assignedTo) : null;
      if (assignedTo && !staff) throw new Error("Choose an active staff account.");
      const assignedName = staff?.name || "";
      await Promise.all([
        updateDocument(COLLECTIONS.leads, id, { assignedTo, assignedName, assignedAt: assignedTo ? now : null, updatedAt: now }),
        updateDocuments(COLLECTIONS.appointments, { filters: [{ field: "leadId", op: "==", value: id }] }, { assignedTo, assignedName, updatedAt: now }),
      ]);
      if (assignedTo) await notifyAssignedStaff({ recipientEmail: assignedTo, type: "lead_assignment", title: "New follow-up assigned", message: `${lead.name} (${lead.phone}) was assigned to you. Open the dashboard and contact the customer within the SLA.`, entityId: id });
    } else if (action === "update_appointment") {
      const id = cleanText(body.id, 100);
      const status = cleanText(body.status, 40) as AppointmentDocument["status"];
      if (!appointmentStatuses.includes(status)) throw new Error("Invalid appointment status.");
      const appointment = await getDocument<AppointmentDocument>(COLLECTIONS.appointments, id);
      if (!appointment) throw new Error("Appointment was not found.");
      if (identity.role === "staff" && appointment.assignedTo !== email) throw new ForbiddenActionError("This appointment is not assigned to your account.");
      await updateDocument(COLLECTIONS.appointments, id, { status, staffNote: cleanText(body.staffNote, 1200), updatedAt: now });
    } else if (action === "assign_appointment") {
      requireRole(identity.role, "admin");
      const id = cleanText(body.id, 100);
      const assignedTo = cleanText(body.assignedTo, 120).toLowerCase();
      const appointment = await getDocument<AppointmentDocument>(COLLECTIONS.appointments, id);
      if (!appointment) throw new Error("Appointment was not found.");
      const staff = assignedTo ? await activeStaffByEmail(assignedTo) : null;
      if (assignedTo && !staff) throw new Error("Choose an active staff account.");
      const assignedName = staff?.name || "";
      await Promise.all([
        updateDocument(COLLECTIONS.appointments, id, { assignedTo, assignedName, updatedAt: now }),
        updateDocument(COLLECTIONS.leads, appointment.leadId, { assignedTo, assignedName, assignedAt: assignedTo ? now : null, updatedAt: now }),
      ]);
      if (assignedTo) await notifyAssignedStaff({ recipientEmail: assignedTo, type: "appointment_assignment", title: "Appointment follow-up assigned", message: `${appointment.name}'s ${appointment.appointmentDate} ${appointment.timeSlot} appointment was assigned to you.`, entityId: id });
    } else if (action === "update_rate") {
      requireRole(identity.role, "admin");
      const id = cleanText(body.id, 100);
      const pricePerGram = Number(body.pricePerGram);
      if (!id || !Number.isFinite(pricePerGram) || pricePerGram < 100 || pricePerGram > 100000) throw new Error("Enter a valid rate per gram.");
      const current = await getDocument<GoldRateDocument>(COLLECTIONS.goldRates, id);
      if (!current) throw new Error("Gold rate was not found.");
      const updated = { pricePerGram: Math.round(pricePerGram), marketPricePerGram: current.marketPricePerGram, adjustmentPercent: current.adjustmentPercent, source: cleanText(body.source, 100) || "Admin managed", isAutomatic: false, isPublished: body.isPublished !== false, updatedBy: email, updatedAt: now };
      await updateDocument(COLLECTIONS.goldRates, id, updated);
    } else if (action === "sync_live_rates") {
      requireRole(identity.role, "admin");
      try {
        const rates = await syncLiveGoldRates(email);
        responseData = { success: true, rates: rates.map(({ karat, pricePerGram }) => ({ karat, pricePerGram })) };
      } catch (error) {
        await notifyAllActiveUsers({
          type: "gold_rate_sync_failed",
          title: "Gold-rate sync failed",
          message: "An administrator's manual GoldAPI update failed. The last published MongoDB rates remain active. Verify the API key, quota and Vercel logs.",
          entityId: "gold-rate-sync",
        }).catch(() => undefined);
        throw error;
      }
    } else if (action === "save_branch") {
      requireRole(identity.role, "admin");
      const name = validateName(body.name);
      const id = cleanText(body.id, 100) || crypto.randomUUID();
      const existing = await getDocument<BranchDocument>(COLLECTIONS.branches, id);
      const values: BranchDocument = { id, name, slug: slugify(body.slug || name), address: cleanText(body.address, 400), phone: cleanText(body.phone, 30), email: validateEmail(body.email), businessHours: cleanText(body.businessHours, 120), mapsUrl: cleanText(body.mapsUrl, 500), isActive: body.isActive !== false, createdAt: existing?.createdAt || now, updatedAt: now };
      if (!values.address || !values.phone || !values.businessHours || !values.mapsUrl) throw new Error("Complete all required branch fields.");
      await setDocument(COLLECTIONS.branches, id, values);
    } else if (action === "save_blog") {
      requireRole(identity.role, "admin");
      const title = cleanText(body.title, 140);
      const id = cleanText(body.id, 100) || crypto.randomUUID();
      const existing = await getDocument<BlogPostDocument>(COLLECTIONS.blogPosts, id);
      const status = cleanText(body.status, 20) === "published" ? "published" as const : "draft" as const;
      if (title.length < 8) throw new Error("Enter a descriptive article title.");
      const values: BlogPostDocument = { id, title, slug: slugify(body.slug || title), excerpt: cleanText(body.excerpt, 320), content: cleanText(body.content, 12000), category: cleanText(body.category, 80) || "Gold Education", status, metaTitle: cleanText(body.metaTitle, 160) || `${title} | Capital Gold Buyers`, metaDescription: cleanText(body.metaDescription, 300) || cleanText(body.excerpt, 160), publishedAt: status === "published" ? now : null, createdAt: existing?.createdAt || now, updatedAt: now };
      if (!values.excerpt || values.content.length < 80) throw new Error("Add a helpful excerpt and article content.");
      await setDocument(COLLECTIONS.blogPosts, id, values);
    } else if (action === "add_staff") {
      requireRole(identity.role, "admin");
      const staffEmail = validateEmail(body.email, true);
      const name = validateName(body.name);
      const role = cleanText(body.role, 20) === "admin" ? "admin" as const : "staff" as const;
      if (staffEmail === email && role !== "admin") throw new Error("You cannot remove your own administrator role.");
      const existing = await profileByEmail(staffEmail);
      const temporaryPassword = typeof body.temporaryPassword === "string" && body.temporaryPassword ? validatePasswordStrength(body.temporaryPassword) : "";
      if (!existing && !temporaryPassword) throw new Error("Enter a temporary password for the new account.");
      const auth = getFirebaseAuth();
      let firebaseUser;
      try {
        firebaseUser = await auth.getUserByEmail(staffEmail);
        firebaseUser = await auth.updateUser(firebaseUser.uid, { displayName: name, disabled: false, ...(temporaryPassword ? { password: temporaryPassword } : {}) });
      } catch (error) {
        if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
        firebaseUser = await auth.createUser({ email: staffEmail, password: temporaryPassword, displayName: name, disabled: false, emailVerified: true });
      }
      await auth.setCustomUserClaims(firebaseUser.uid, { role });
      if (existing && (temporaryPassword || existing.role !== role)) await auth.revokeRefreshTokens(firebaseUser.uid);
      await setDocument<StaffUserDocument>(COLLECTIONS.users, firebaseUser.uid, { id: firebaseUser.uid, firebaseUid: firebaseUser.uid, email: staffEmail, name, role, isActive: true, lastLoginAt: existing?.lastLoginAt || null, createdAt: existing?.createdAt || now, updatedAt: now });
    } else if (action === "reset_staff_password") {
      requireRole(identity.role, "admin");
      const staffEmail = validateEmail(body.email, true);
      const profile = await profileByEmail(staffEmail);
      if (!profile) throw new Error("Staff account was not found.");
      const password = validatePasswordStrength(body.temporaryPassword);
      const auth = getFirebaseAuth();
      await auth.updateUser(profile.firebaseUid, { password });
      await auth.revokeRefreshTokens(profile.firebaseUid);
      await updateDocument(COLLECTIONS.users, profile.id, { updatedAt: now });
    } else if (action === "toggle_staff") {
      requireRole(identity.role, "admin");
      const staffEmail = validateEmail(body.email, true);
      if (staffEmail === email && body.isActive !== true) throw new Error("You cannot disable your own active administrator account.");
      const profile = await profileByEmail(staffEmail);
      if (!profile) throw new Error("Staff account was not found.");
      const isActive = body.isActive === true;
      const auth = getFirebaseAuth();
      await auth.updateUser(profile.firebaseUid, { disabled: !isActive });
      await auth.revokeRefreshTokens(profile.firebaseUid);
      await updateDocument(COLLECTIONS.users, profile.id, { isActive, updatedAt: now });
    } else if (action === "change_password") {
      const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
      const newPassword = validatePasswordStrength(body.newPassword);
      await signInWithFirebasePassword(email, currentPassword);
      const auth = getFirebaseAuth();
      await auth.updateUser(identity.user.id, { password: newPassword });
      await auth.revokeRefreshTokens(identity.user.id);
      await updateDocument(COLLECTIONS.users, identity.user.id, { updatedAt: now });
      responseData = { success: true, sessionExpired: true };
    } else {
      throw new Error("Unsupported dashboard action.");
    }
    return privateJson(responseData);
  } catch (error) {
    return privateJson({ error: safeError(error) }, error instanceof ForbiddenActionError ? 403 : 400);
  }
}
