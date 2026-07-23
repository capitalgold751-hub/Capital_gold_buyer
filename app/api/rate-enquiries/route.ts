import {
  COLLECTIONS,
  findFirst,
  listDocuments,
  setDocument,
  updateDocument,
} from "../../../db";
import type {
  GoldRateDocument,
  LeadDocument,
} from "../../../db/schema";
import { notifyAdmins } from "../../lib/business-notifications";
import { limitSubmission, RateLimitError } from "../../lib/rate-limit";
import { isConsentAccepted } from "../../lib/request-security";
import {
  cleanText,
  normalizeIndianPhone,
  safeError,
  validateName,
} from "../../lib/validation";

const RATE_CACHE_HEADERS = {
  "Cache-Control":
    "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET() {
  try {
    const rows = await listDocuments<GoldRateDocument>(
      COLLECTIONS.goldRates,
      {
        filters: [
          {
            field: "isPublished",
            op: "==",
            value: true,
          },
        ],
        orderBy: {
          field: "pricePerGram",
          direction: "desc",
        },
        limit: 10,
      },
    );

    return Response.json(
      {
        rates: rows.map((row) => ({
          karat: row.karat,
          pricePerGram: row.pricePerGram,
        })),
        updatedAt: rows[0]?.updatedAt ?? null,
        source: rows[0]?.source || "Manual",
      },
      {
        headers: RATE_CACHE_HEADERS,
      },
    );
  } catch (error) {
    console.error("GET /api/rate-enquiries failed; using emergency fallback:", error);

    const fallbackRates = [
      { karat: "24K", pricePerGram: Number(process.env.FALLBACK_GOLD_RATE_24K || 7420) },
      { karat: "22K", pricePerGram: Number(process.env.FALLBACK_GOLD_RATE_22K || 6802) },
      { karat: "18K", pricePerGram: Number(process.env.FALLBACK_GOLD_RATE_18K || 5565) },
    ];

    return Response.json(
      {
        rates: fallbackRates,
        updatedAt: null,
        source: "Emergency fallback",
        fallbackActive: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "X-Rate-Fallback": "true",
        },
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Honeypot field
    if (cleanText(body.company)) {
      return Response.json(
        { success: true },
        { status: 201 },
      );
    }

    const name = validateName(body.name);
    const phone = normalizeIndianPhone(body.phone);

    if (!isConsentAccepted(body.consent)) {
      throw new Error(
        "Please accept the enquiry consent to continue.",
      );
    }

    const branch =
      cleanText(body.branch, 80) || "Basaveshwara Nagar";

    const source =
      cleanText(body.source, 100) || "website_gold_rate";

    await limitSubmission(request, phone, "rate-enquiry");

    const now = new Date().toISOString();
    const enquiryId = crypto.randomUUID();

    const existing = await findFirst<LeadDocument>(
      COLLECTIONS.leads,
      {
        filters: [
          {
            field: "phone",
            op: "==",
            value: phone,
          },
        ],
        orderBy: {
          field: "createdAt",
          direction: "desc",
        },
      },
    );

    const leadId = existing?.id || crypto.randomUUID();

    if (existing) {
      await updateDocument(
        COLLECTIONS.leads,
        existing.id,
        {
          name,
          source,
          branch,
          status:
            existing.status === "closed"
              ? "new"
              : existing.status,
          priority: "high",
          updatedAt: now,
        },
      );
    } else {
      await setDocument<LeadDocument>(
        COLLECTIONS.leads,
        leadId,
        {
          id: leadId,
          name,
          phone,
          email: "",
          source,
          branch,
          status: "new",
          priority: "high",
          assignedTo: "",
          assignedName: "",
          assignedAt: null,
          notes:
            "Requested a personalised gold-rate follow-up.",
          nextFollowUp: null,
          firstContactedAt: null,
          lastContactedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      );
    }

    // Do not fail the enquiry when email delivery fails.
    try {
      await notifyAdmins({
        type: "rate_enquiry",
        title: "New gold-rate enquiry",
        message: `${name} (${phone}) requested a personalised rate follow-up.`,
        entityId: enquiryId,
      });
    } catch (error) {
        console.error("Admin notification failed:", error);
    }

    // Do not read gold rates again after submission.
    return Response.json(
      {
        success: true,
        enquiryId,
        message:
          "Your enquiry was submitted successfully. Our team will contact you.",
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("POST /api/rate-enquiries failed:", error);

    return Response.json(
      {
        error: safeError(error),
      },
      {
        status: error instanceof RateLimitError ? 429 : 400,
      },
    );
  }
}
