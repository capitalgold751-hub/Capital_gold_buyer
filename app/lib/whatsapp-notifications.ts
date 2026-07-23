import { getGoldAdminSettings } from "./admin-settings";
type WhatsAppApiResponse = {
  messages?: Array<{
    id?: string;
  }>;
  error?: {
    message?: string;
    code?: number;
  };
};

function normalizeWhatsAppNumber(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function sendAdminWhatsAppAlert(
  message: string,
) {
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN;

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

  const settings = await getGoldAdminSettings();
  if (!settings.whatsappAlertsEnabled) return { success: false, reason: "disabled" };
  const adminPhone = settings.whatsappNumber || process.env.ADMIN_WHATSAPP_NUMBER;

  if (!accessToken) {
    console.warn(
      "WhatsApp alert skipped: WHATSAPP_ACCESS_TOKEN is missing.",
    );

    return {
      success: false,
      reason: "missing_access_token",
    };
  }

  if (!phoneNumberId) {
    console.warn(
      "WhatsApp alert skipped: WHATSAPP_PHONE_NUMBER_ID is missing.",
    );

    return {
      success: false,
      reason: "missing_phone_number_id",
    };
  }

  if (!adminPhone) {
    console.warn(
      "WhatsApp alert skipped: ADMIN_WHATSAPP_NUMBER is missing.",
    );

    return {
      success: false,
      reason: "missing_admin_number",
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizeWhatsAppNumber(adminPhone),
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      }),
      cache: "no-store",
    },
  );

  const result =
    (await response.json()) as WhatsAppApiResponse;

  if (!response.ok) {
    throw new Error(
      result.error?.message ||
        `WhatsApp API failed with status ${response.status}`,
    );
  }

  return {
    success: true,
    messageId: result.messages?.[0]?.id ?? null,
  };
}
