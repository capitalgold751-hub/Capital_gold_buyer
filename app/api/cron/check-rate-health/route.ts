import { getGoldRateHealth, markGoldRateAlertSent } from "../../../lib/gold-rate-service";
import { notifyAdmins } from "../../../lib/business-notifications";
import { sendAdminWhatsAppAlert } from "../../../lib/whatsapp-notifications";
import { getGoldAdminSettings } from "../../../lib/admin-settings";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const health = await getGoldRateHealth();
  const settings = await getGoldAdminSettings();
  if (!health.stale) return Response.json({ success: true, stale: false, lastSuccessAt: health.lastSuccessAt });
  const lastAlert = health.status?.lastAlertAt ? new Date(health.status.lastAlertAt).getTime() : 0;
  if (Date.now() - lastAlert > settings.alertCooldownHours * 3_600_000) {
    const message = `Gold rates have not updated for more than ${health.staleHours} hours. Last success: ${health.lastSuccessAt || "never"}. Previous published rates remain visible.`;
    await Promise.allSettled([
      notifyAdmins({ type:"gold_rate_stale", title:"Gold rates are stale", message, entityId:"gold-rate-health" }),
      sendAdminWhatsAppAlert(`⚠️ Capital Gold Buyers\n\n${message}\n\nOpen dashboard: ${(process.env.NEXT_PUBLIC_SITE_URL || "https://capitalgoldbuyers.in")}/dashboard`),
    ]);
    await markGoldRateAlertSent();
  }
  return Response.json({ success: true, stale: true, lastSuccessAt: health.lastSuccessAt });
}
