import { markGoldRateAlertSent, markGoldRateSyncFailure, syncLiveGoldRates } from "../../../lib/gold-rate-service";
import { notifyAllActiveUsers } from "../../../lib/business-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (
    !secret ||
    request.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const rates = await syncLiveGoldRates("vercel-cron");

    return Response.json({
      success: true,
      updatedAt: rates[0]?.updatedAt ?? null,
      rates: rates.map(({ karat, pricePerGram }) => ({
        karat,
        pricePerGram,
      })),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown gold-rate sync error";

    console.error(
      "Automatic gold-rate sync failed:",
      errorMessage,
    );

    await markGoldRateSyncFailure(error, "vercel-cron").catch(() => undefined);

    await notifyAllActiveUsers({
      type: "gold_rate_sync_failed",
      title: "Gold-rate sync failed",
      message:
        "Automatic GoldAPI update failed. The latest previously published rates remain active.",
      entityId: "gold-rate-sync",
    }).catch((notificationError) => {
      console.error(
        "Internal notification failed:",
        notificationError,
      );
    });

    try {
      const { sendAdminWhatsAppAlert } = await import(
        "../../../lib/whatsapp-notifications"
      );

      await sendAdminWhatsAppAlert(
        [
          "⚠️ Capital Gold Buyers Alert",
          "",
          "Automatic GoldAPI rate update failed.",
          "The website is displaying the last published rates.",
          "",
          "Please open the admin dashboard and update the latest rates manually:",
          "https://capitalgoldbuyers.in/dashboard",
          "",
          `Error: ${errorMessage}`,
        ].join("\n"),
      );
      await markGoldRateAlertSent().catch(() => undefined);
    } catch (whatsappError) {
      console.error(
        "WhatsApp notification failed:",
        whatsappError,
      );
    }

    return Response.json(
      {
        success: false,
        fallbackActive: true,
        error:
          "Rate sync failed. Last published rates remain active.",
      },
      {
        status: 502,
      },
    );
  }
}
