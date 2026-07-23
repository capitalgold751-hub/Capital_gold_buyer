import {
  COLLECTIONS,
  findFirst,
  getDocument,
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
  GoldRateHistoryDocument,
  GoldRateSyncStatusDocument,
  GoldAdminSettingsDocument,
  AuditLogDocument,
  AnalyticsEventDocument,
  LeadDocument,
  StaffUserDocument,
} from "../../../db/schema";
import { appointmentStatuses, leadStatuses } from "../../lib/site-config";
import { ForbiddenActionError, getDashboardIdentity, requireRole } from "../../lib/dashboard-auth";
import { validatePasswordStrength } from "../../lib/password";
import { hashPassword, verifyPassword } from "../../lib/mongodb-auth";
import { assertSameOrigin } from "../../lib/request-security";
import { notifyAdmins, notifyAllActiveUsers, notifyAssignedStaff } from "../../lib/business-notifications";
import { sendAdminWhatsAppAlert } from "../../lib/whatsapp-notifications";
import { getGoldRateHealth, markGoldRateSyncFailure, recordManualGoldRate, syncLiveGoldRates } from "../../lib/gold-rate-service";
import { cleanText, safeError, slugify, validateEmail, validateName } from "../../lib/validation";
import { getGoldAdminSettings, saveGoldAdminSettings } from "../../lib/admin-settings";

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

    const needsLeads = ["Overview", "Leads", "Analytics", "Reports"].includes(section);
    const needsAppointments = ["Overview", "Appointments", "Reports"].includes(section);
    const needsRates = isAdmin && ["Overview", "Gold Rates", "Settings", "Reports"].includes(section);
    const needsStaff = isAdmin && ["Leads", "Appointments", "Staff"].includes(section);
    const needsBranches = isAdmin && section === "Branches";
    const needsBlogs = isAdmin && section === "Blog CMS";
    const needsAudit = isAdmin && ["Audit Logs", "Security"].includes(section);
    const needsAnalytics = isAdmin && ["Overview", "Analytics"].includes(section);

    const [rateRows, leadRows, appointmentRows, branchRows, blogRows, staffRows, rateHealth, goldSettings, auditRows, analyticsRows] = await Promise.all([
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
      needsRates ? getGoldRateHealth() : Promise.resolve({ status: null, stale: false, staleHours: 12, lastSuccessAt: null, history: [] as GoldRateHistoryDocument[] }),
      needsRates ? getGoldAdminSettings() : Promise.resolve(null),
      needsAudit ? listDocuments<AuditLogDocument>(COLLECTIONS.auditLogs, { orderBy: { field: "createdAt", direction: "desc" }, limit: 100 }) : Promise.resolve([]),
      needsAnalytics ? listDocuments<AnalyticsEventDocument>(COLLECTIONS.analyticsEvents, { orderBy: { field: "createdAt", direction: "desc" }, limit: 500 }) : Promise.resolve([]),
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
        pageViews: analyticsRows.filter((event) => event.eventName === "page_view").length,
        uniqueVisitors: new Set(analyticsRows.map((event) => event.sessionId)).size,
      },
      rates: rateRows,
      rateHealth: { status: rateHealth.status, stale: rateHealth.stale, staleHours: rateHealth.staleHours, lastSuccessAt: rateHealth.lastSuccessAt },
      rateHistory: rateHealth.history,
      goldSettings,
      enquiries: enquiryRows,
      leads: leadRows,
      appointments: appointmentRows,
      branches: branchRows,
      blogs: blogRows,
      staff: staffRows.map((user) => ({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt, updatedAt: user.updatedAt })),
      notifications: [], auditLogs: auditRows, analytics: analyticsRows, quotaMode: "mongodb", loadedSection: section,
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
      await recordManualGoldRate({ ...current, ...updated });
    } else if (action === "save_gold_settings") {
      requireRole(identity.role, "admin");
      const alertEmails = cleanText(body.alertEmails, 1000).split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
      for (const alertEmail of alertEmails) validateEmail(alertEmail, true);
      const whatsappNumber = cleanText(body.whatsappNumber, 30).replace(/\D/g, "");
      const staleHours = Math.min(168, Math.max(1, Number(body.staleHours || 12)));
      const alertCooldownHours = Math.min(72, Math.max(1, Number(body.alertCooldownHours || 6)));
      const indicativeAdjustmentPercent = Math.min(110, Math.max(50, Number(body.indicativeAdjustmentPercent || 99.9)));
      const settings: GoldAdminSettingsDocument = {
        id: "gold-alert-settings",
        emailAlertsEnabled: body.emailAlertsEnabled === true,
        alertEmails,
        whatsappAlertsEnabled: body.whatsappAlertsEnabled === true,
        whatsappNumber,
        staleHours,
        alertCooldownHours,
        automaticSyncEnabled: body.automaticSyncEnabled === true,
        indicativeAdjustmentPercent,
        updatedAt: now,
        updatedBy: email,
      };
      await saveGoldAdminSettings(settings);
    } else if (action === "test_email_alert") {
      requireRole(identity.role, "admin");
      const result = await notifyAdmins({ type: "test_alert", title: "Capital Gold test email", message: `Test email sent from the dashboard by ${email}.`, entityId: crypto.randomUUID() });
      responseData = { success: true, result };
    } else if (action === "test_whatsapp_alert") {
      requireRole(identity.role, "admin");
      responseData = { success: true, result: await sendAdminWhatsAppAlert(`Capital Gold dashboard test alert from ${email}.`) };
    } else if (action === "sync_live_rates") {
      requireRole(identity.role, "admin");
      try {
        const rates = await syncLiveGoldRates(email);
        responseData = { success: true, rates: rates.map(({ karat, pricePerGram }) => ({ karat, pricePerGram })) };
      } catch (error) {
        await markGoldRateSyncFailure(error, email).catch(() => undefined);
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
      const id = existing?.id || crypto.randomUUID();
      const passwordHash = temporaryPassword
        ? await hashPassword(temporaryPassword)
        : existing?.passwordHash;
      if (!passwordHash) throw new Error("Enter a temporary password for the new account.");
      const sessionVersion = existing
        ? (existing.sessionVersion || 0) + (temporaryPassword || existing.role !== role ? 1 : 0)
        : 1;
      await setDocument<StaffUserDocument>(COLLECTIONS.users, id, {
        id,
        passwordHash,
        sessionVersion,
        email: staffEmail,
        name,
        role,
        isActive: true,
        lastLoginAt: existing?.lastLoginAt || null,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      });
    } else if (action === "reset_staff_password") {
      requireRole(identity.role, "admin");
      const staffEmail = validateEmail(body.email, true);
      const profile = await profileByEmail(staffEmail);
      if (!profile) throw new Error("Staff account was not found.");
      const password = validatePasswordStrength(body.temporaryPassword);
      await updateDocument(COLLECTIONS.users, profile.id, {
        passwordHash: await hashPassword(password),
        sessionVersion: (profile.sessionVersion || 0) + 1,
        updatedAt: now,
      });
    } else if (action === "toggle_staff") {
      requireRole(identity.role, "admin");
      const staffEmail = validateEmail(body.email, true);
      if (staffEmail === email && body.isActive !== true) throw new Error("You cannot disable your own active administrator account.");
      const profile = await profileByEmail(staffEmail);
      if (!profile) throw new Error("Staff account was not found.");
      const isActive = body.isActive === true;
      await updateDocument(COLLECTIONS.users, profile.id, {
        isActive,
        sessionVersion: (profile.sessionVersion || 0) + 1,
        updatedAt: now,
      });
    } else if (action === "change_password") {
      const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
      const newPassword = validatePasswordStrength(body.newPassword);
      const profile = await getDocument<StaffUserDocument>(COLLECTIONS.users, identity.user.id);
      if (!profile || !await verifyPassword(currentPassword, profile.passwordHash)) {
        throw new Error("Current password is incorrect.");
      }
      await updateDocument(COLLECTIONS.users, identity.user.id, {
        passwordHash: await hashPassword(newPassword),
        sessionVersion: (profile.sessionVersion || 0) + 1,
        updatedAt: now,
      });
      responseData = { success: true, sessionExpired: true };
    } else {
      throw new Error("Unsupported dashboard action.");
    }
    if (!["change_password"].includes(action)) {
      const auditId = crypto.randomUUID();
      await setDocument<AuditLogDocument>(COLLECTIONS.auditLogs, auditId, {
        id: auditId, actorEmail: email, action, entityType: cleanText(body.id, 100) ? "record" : "system",
        entityId: cleanText(body.id, 100) || cleanText(body.email, 120) || "dashboard",
        details: `Dashboard action completed: ${action}`, createdAt: now,
      }).catch(() => undefined);
    }
    return privateJson(responseData);
  } catch (error) {
    return privateJson({ error: safeError(error) }, error instanceof ForbiddenActionError ? 403 : 400);
  }
}
