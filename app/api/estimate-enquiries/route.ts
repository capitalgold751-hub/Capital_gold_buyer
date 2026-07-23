import { COLLECTIONS, findFirst, setDocument, updateDocument } from "../../../db";
import type { GoldRateDocument, LeadDocument } from "../../../db/schema";
import { notifyAdmins } from "../../lib/business-notifications";
import { limitSubmission, RateLimitError } from "../../lib/rate-limit";
import { isConsentAccepted } from "../../lib/request-security";
import {
  cleanText,
  normalizeIndianPhone,
  safeError,
  validateName,
} from "../../lib/validation";

const ALLOWED_PURITY = new Set(["18K", "22K", "24K"]);

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Honeypot spam protection
    if (cleanText(body.company)) {
      return Response.json({ success: true }, { status: 201 });
    }

    const name = validateName(body.name);
    const phone = normalizeIndianPhone(body.phone);

    if (!isConsentAccepted(body.consent)) {
      throw new Error(
        "Please accept the estimate enquiry consent to continue."
      );
    }

    const weight = Number(body.weight);
    const purity = cleanText(body.purity, 3).toUpperCase();

    // Fixed default payout (field removed from UI)
    const payoutPercent = 99.9;

    const branch =
      cleanText(body.branch, 80) || "Basaveshwara Nagar";

    if (!Number.isFinite(weight) || weight <= 0 || weight > 100000) {
      throw new Error("Enter a valid gold weight.");
    }

    if (!ALLOWED_PURITY.has(purity)) {
      throw new Error("Select a valid gold purity.");
    }

    await limitSubmission(request, phone, "estimate");

    const publishedRate =
      await findFirst<GoldRateDocument>(
        COLLECTIONS.goldRates,
        {
          filters: [
            {
              field: "karat",
              op: "==",
              value: purity,
            },
            {
              field: "isPublished",
              op: "==",
              value: true,
            },
          ],
        }
      );

    if (!publishedRate) {
      throw new Error(
        "The selected gold rate is temporarily unavailable."
      );
    }

    const estimatedValue = Math.round(
      (weight * publishedRate.pricePerGram * payoutPercent) / 100
    );

    const now = new Date().toISOString();
    const enquiryId = crypto.randomUUID();

    const estimateNote = `Estimate: ${weight} g, ${purity}, ${payoutPercent}% payout = ${currency(
      estimatedValue
    )}.`;

    const existing =
      await findFirst<LeadDocument>(
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
        }
      );

    const leadId = existing?.id || crypto.randomUUID();

    if (existing) {
      await updateDocument(
        COLLECTIONS.leads,
        existing.id,
        {
          name,
          source: "gold_estimate",
          branch,
          priority: "urgent",
          status:
            existing.status === "closed"
              ? "new"
              : existing.status,
          notes: `${estimateNote}\n${existing.notes}`.slice(
            0,
            2000
          ),
          updatedAt: now,
        }
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
          source: "gold_estimate",
          branch,
          status: "new",
          priority: "urgent",
          assignedTo: "",
          assignedName: "",
          assignedAt: null,
          notes: estimateNote,
          nextFollowUp: null,
          firstContactedAt: null,
          lastContactedAt: null,
          createdAt: now,
          updatedAt: now,
        }
      );
    }

    // Notification failure should never fail enquiry submission
    try {
      await notifyAdmins({
        type: "estimate_enquiry",
        title: "New gold estimate enquiry",
        message: `${name} (${phone}) requested ${purity} / ${weight} g; estimated value ${currency(
          estimatedValue
        )}.`,
        entityId: enquiryId,
      });
    } catch (notificationError) {
      console.error(
        "Admin notification failed:",
        notificationError
      );
    }

    return Response.json(
      {
        success: true,
        enquiryId,
        estimatedValue,
        message:
          "Estimate unlocked. Admin has received your enquiry for staff assignment.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/estimate-enquiries failed:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : safeError(error),
      },
      {
        status:
          error instanceof RateLimitError
            ? 429
            : 400,
      }
    );
  }
}