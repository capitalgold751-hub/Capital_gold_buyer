import { COLLECTIONS, findFirst, getDocument, listDocuments, setDocument } from "../../db";
import type { GoldRateDocument, GoldRateHistoryDocument, GoldRateSyncStatusDocument } from "../../db/schema";
import { getGoldAdminSettings } from "./admin-settings";

const TROY_OUNCE_GRAMS = 31.1034768;
const KARATS = ["24K", "22K", "18K"] as const;
const STATUS_ID = "current";

async function configuration() {
  const settings = await getGoldAdminSettings();
  return {
    key: process.env.GOLDAPI_KEY?.trim() || "",
    adjustment: settings.indicativeAdjustmentPercent,
    automaticSyncEnabled: settings.automaticSyncEnabled,
    staleHours: settings.staleHours,
  };
}

async function saveHistory(rate: GoldRateDocument, trigger: "automatic" | "manual") {
  const historyId = crypto.randomUUID();
  const row: GoldRateHistoryDocument = { ...rate, id: historyId, historyId, rateId: rate.id, trigger };
  await setDocument(COLLECTIONS.goldRateHistory, historyId, row);
}

export async function recordManualGoldRate(rate: GoldRateDocument) {
  await Promise.all([
    setDocument(COLLECTIONS.goldRates, rate.id, rate),
    saveHistory(rate, "manual"),
    setDocument<GoldRateSyncStatusDocument>(COLLECTIONS.goldRateSyncStatus, STATUS_ID, {
      id: STATUS_ID, status: "healthy", lastAttemptAt: rate.updatedAt, lastSuccessAt: rate.updatedAt,
      lastFailureAt: null, lastError: "", source: "Manual dashboard update", updatedAt: rate.updatedAt,
      consecutiveFailures: 0, lastAlertAt: null,
    }, true),
  ]);
}

export async function markGoldRateSyncFailure(error: unknown, source: string) {
  const now = new Date().toISOString();
  const previous = await getDocument<GoldRateSyncStatusDocument>(COLLECTIONS.goldRateSyncStatus, STATUS_ID);
  const message = error instanceof Error ? error.message : "Unknown gold-rate sync error";
  const status: GoldRateSyncStatusDocument = {
    id: STATUS_ID, status: "failed", lastAttemptAt: now, lastSuccessAt: previous?.lastSuccessAt || null,
    lastFailureAt: now, lastError: message.slice(0, 500), source, updatedAt: now,
    consecutiveFailures: (previous?.consecutiveFailures || 0) + 1, lastAlertAt: previous?.lastAlertAt || null,
  };
  await setDocument(COLLECTIONS.goldRateSyncStatus, STATUS_ID, status);
  return status;
}

export async function markGoldRateAlertSent() {
  const status = await getDocument<GoldRateSyncStatusDocument>(COLLECTIONS.goldRateSyncStatus, STATUS_ID);
  if (status) await setDocument(COLLECTIONS.goldRateSyncStatus, STATUS_ID, { ...status, lastAlertAt: new Date().toISOString() });
}

export async function getGoldRateHealth() {
  const [status, rates, history] = await Promise.all([
    getDocument<GoldRateSyncStatusDocument>(COLLECTIONS.goldRateSyncStatus, STATUS_ID),
    listDocuments<GoldRateDocument>(COLLECTIONS.goldRates, { orderBy: { field: "updatedAt", direction: "desc" }, limit: 4 }),
    listDocuments<GoldRateHistoryDocument>(COLLECTIONS.goldRateHistory, { orderBy: { field: "updatedAt", direction: "desc" }, limit: 90 }),
  ]);
  const lastSuccessAt = status?.lastSuccessAt || rates[0]?.updatedAt || null;
  const settings = await getGoldAdminSettings();
  const staleHours = settings.staleHours;
  const stale = !lastSuccessAt || Date.now() - new Date(lastSuccessAt).getTime() > staleHours * 3_600_000;
  return { status: status || null, stale, staleHours, lastSuccessAt, history };
}

export async function syncLiveGoldRates(actor = "automatic-cron") {
  const config = await configuration();
  if (!config.automaticSyncEnabled && actor === "vercel-cron") return [];
  if (!config.key) throw new Error("GOLDAPI_KEY is not configured. Previous MongoDB rates remain active.");
  const response = await fetch("https://www.goldapi.io/api/XAU/INR", {
    headers: { "x-access-token": config.key, "content-type": "application/json" },
    cache: "no-store", signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "GoldAPI rate request failed.");
  const pricePerOunce = Number(payload.price);
  if (!Number.isFinite(pricePerOunce) || pricePerOunce <= 0) throw new Error("GoldAPI returned an invalid XAU/INR price.");
  const market24K = pricePerOunce / TROY_OUNCE_GRAMS;
  const now = new Date().toISOString();
  const updated: GoldRateDocument[] = [];
  for (const karat of KARATS) {
    const purity = Number(karat.replace("K", "")) / 24;
    const marketPricePerGram = Math.round(market24K * purity);
    const pricePerGram = Math.round(marketPricePerGram * config.adjustment / 100);
    const existing = await findFirst<GoldRateDocument>(COLLECTIONS.goldRates, { filters: [{ field: "karat", op: "==", value: karat }] });
    const row: GoldRateDocument = { id: existing?.id || crypto.randomUUID(), karat, pricePerGram, marketPricePerGram,
      adjustmentPercent: config.adjustment, source: "GoldAPI XAU/INR", isAutomatic: true,
      isPublished: existing?.isPublished ?? true, updatedBy: actor, updatedAt: now };
    await Promise.all([setDocument(COLLECTIONS.goldRates, row.id, row), saveHistory(row, "automatic")]);
    updated.push(row);
  }
  await setDocument<GoldRateSyncStatusDocument>(COLLECTIONS.goldRateSyncStatus, STATUS_ID, {
    id: STATUS_ID, status: "healthy", lastAttemptAt: now, lastSuccessAt: now, lastFailureAt: null,
    lastError: "", source: actor, updatedAt: now, consecutiveFailures: 0, lastAlertAt: null,
  });
  return updated;
}
