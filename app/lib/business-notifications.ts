import nodemailer from "nodemailer";
import { getGoldAdminSettings } from "./admin-settings";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
}

async function sendEmail(to: string[], subject: string, message: string) {
  const recipients = [...new Set(to.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (!recipients.length) return { configured: false, sent: false };
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  if (smtpUser && smtpPass) {
    try {
      const port = Number(process.env.SMTP_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
        port: Number.isFinite(port) ? port : 465,
        secure: (process.env.SMTP_SECURE || "true").toLowerCase() !== "false",
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM?.trim() || `Capital Gold Buyers <${smtpUser}>`,
        to: recipients,
        subject,
        html: emailHtml(subject, message),
      });
      return { configured: true, sent: true };
    } catch {
      // Continue to the optional HTTPS email provider before falling back to dashboard-only alerts.
    }
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return { configured: Boolean(smtpUser && smtpPass), sent: false };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from, to: recipients, subject,
        html: emailHtml(subject, message),
      }),
      cache: "no-store",
    });
    return { configured: true, sent: response.ok };
  } catch {
    return { configured: true, sent: false };
  }
}

function emailHtml(subject: string, message: string) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://capitalgoldbuyers.in"}/dashboard`;
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#173b31"><h2 style="color:#075143">${escapeHtml(subject)}</h2><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(dashboardUrl)}">Open protected dashboard</a></p></div>`;
}

async function configuredAdminEmails() {
  const settings = await getGoldAdminSettings();
  return settings.emailAlertsEnabled ? settings.alertEmails : [];
}

export async function notifyAdmins(input: { type: string; title: string; message: string; entityId: string }) {
  const recipients = await configuredAdminEmails();
  await sendEmail(recipients, input.title, input.message);
  return { id: input.entityId, ...input, createdAt: new Date().toISOString() };
}

export async function notifyAssignedStaff(input: { recipientEmail: string; type: string; title: string; message: string; entityId: string }) {
  await sendEmail([input.recipientEmail.toLowerCase()], input.title, input.message);
  return { id: input.entityId, ...input, createdAt: new Date().toISOString() };
}

export async function notifyAllActiveUsers(input: { type: string; title: string; message: string; entityId: string }) {
  // Avoid reading all staff profiles and avoid writing dashboard notification documents.
  await sendEmail(await configuredAdminEmails(), input.title, input.message);
  return { id: input.entityId, ...input, createdAt: new Date().toISOString() };
}
