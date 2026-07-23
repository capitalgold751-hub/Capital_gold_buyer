import { COLLECTIONS, getDocument, setDocument } from "../../db";
import type { GoldAdminSettingsDocument } from "../../db/schema";

const SETTINGS_ID = "gold-alert-settings";

export function defaultGoldAdminSettings(): GoldAdminSettingsDocument {
  return {
    id: SETTINGS_ID,
    emailAlertsEnabled: true,
    alertEmails: (process.env.ADMIN_NOTIFICATION_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean),
    whatsappAlertsEnabled: true,
    whatsappNumber: (process.env.ADMIN_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
    staleHours: Math.max(1, Number(process.env.GOLD_RATE_STALE_HOURS || 12)),
    alertCooldownHours: 6,
    automaticSyncEnabled: true,
    indicativeAdjustmentPercent: Math.min(110, Math.max(50, Number(process.env.GOLD_RATE_ADJUSTMENT_PERCENT || 99.9))),
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
  };
}

export async function getGoldAdminSettings() {
  return (await getDocument<GoldAdminSettingsDocument>(COLLECTIONS.goldAdminSettings, SETTINGS_ID)) || defaultGoldAdminSettings();
}

export async function saveGoldAdminSettings(settings: GoldAdminSettingsDocument) {
  await setDocument(COLLECTIONS.goldAdminSettings, SETTINGS_ID, settings);
  return settings;
}
