import { COLLECTIONS, getDocument, getFirebaseAuth, setDocument } from ".";
import { validatePasswordStrength } from "../app/lib/password";
import type { BlogPostDocument, BranchDocument, GoldRateDocument, StaffUserDocument, UserRole } from "./schema";

let bootstrapPromise: Promise<void> | null = null;

export function ensureBaseData() {
  bootstrapPromise ??= seedBaseData().catch((error) => {
    bootstrapPromise = null;
    throw error;
  });
  return bootstrapPromise;
}

async function createIfMissing<T extends { id: string }>(collectionName: string, id: string, document: T) {
  if (!await getDocument<T>(collectionName, id)) await setDocument(collectionName, id, document);
}

async function ensureInitialUser(input: { role: UserRole; name: string; email?: string; password?: string }, now: string) {
  const email = input.email?.trim().toLowerCase();
  if (!email || !input.password) return;
  const password = validatePasswordStrength(input.password);
  const auth = getFirebaseAuth();
  let firebaseUser;
  try {
    firebaseUser = await auth.getUserByEmail(email);
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    firebaseUser = await auth.createUser({ email, password, displayName: input.name.trim(), disabled: false, emailVerified: true });
  }
  await auth.setCustomUserClaims(firebaseUser.uid, { role: input.role });
  const existing = await getDocument<StaffUserDocument>(COLLECTIONS.users, firebaseUser.uid);
  if (!existing) {
    await setDocument<StaffUserDocument>(COLLECTIONS.users, firebaseUser.uid, {
      id: firebaseUser.uid,
      firebaseUid: firebaseUser.uid,
      email,
      name: input.name.trim(),
      role: input.role,
      isActive: !firebaseUser.disabled,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function seedBaseData() {
  const now = new Date().toISOString();
  await Promise.all(([
    ["24K", 7420],
    ["22K", 6802],
    ["18K", 5565],
  ] as const).map(async ([karat, pricePerGram]) => {
    const id = `gold-${karat.toLowerCase()}`;
    await createIfMissing<GoldRateDocument>(COLLECTIONS.goldRates, id, {
      id,
      karat,
      pricePerGram,
      marketPricePerGram: null,
      adjustmentPercent: 100,
      source: "Manual starter rate",
      isAutomatic: false,
      isPublished: true,
      updatedBy: "system",
      updatedAt: now,
    });
  }));

  const branchId = "basaveshwara-nagar";
  await createIfMissing<BranchDocument>(COLLECTIONS.branches, branchId, {
    id: branchId,
    name: `${process.env.NEXT_PUBLIC_PRIMARY_BRANCH || "Basaveshwara Nagar"} Branch`,
    slug: branchId,
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "1st Floor, 2/80, 3rd Stage, 2nd Block, 7th Main, Basaveshwara Nagar, Bengaluru, Karnataka 560079",
    phone: process.env.NEXT_PUBLIC_PRIMARY_PHONE_DISPLAY || "+91 80886 50337",
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "capitalgold751@gmail.com",
    businessHours: "Monday–Saturday, 9:30 AM–7:00 PM",
    mapsUrl: process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL || "https://www.google.com/maps/search/?api=1&query=Capital+Gold+Buyers+Basaveshwara+Nagar+Bengaluru",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const starterPosts = [
    ["How Gold Purity Testing Works", "how-gold-purity-testing-works", "Understand karat, purity percentage and the transparent steps used during a professional gold evaluation.", "Gold purity testing identifies how much pure gold is present in an ornament. A professional evaluation checks weight, separates non-gold components and uses calibrated testing equipment before calculating an indicative value. Always ask to see the weight, purity result and rate used in the calculation."],
    ["18K vs 22K vs 24K Gold", "18k-vs-22k-vs-24k-gold", "A simple guide to common gold karats and how purity influences estimated value.", "Twenty-four karat gold is close to pure gold, while 22K and 18K include other metals for strength and durability. Estimated value is based on net gold weight, verified purity and the applicable buying rate at the time of evaluation."],
    ["What to Carry When Selling Gold", "what-to-carry-when-selling-gold", "Prepare for your branch visit with identification, jewellery details and payment information.", "Before visiting, confirm the branch requirements by phone. Carry valid identification and any purchase documents you have. Ask the team to explain the testing method, deductions, final offer and payment method before you decide to proceed."],
  ] as const;
  await Promise.all(starterPosts.map(async ([title, slug, excerpt, content]) => {
    await createIfMissing<BlogPostDocument>(COLLECTIONS.blogPosts, slug, {
      id: slug,
      title,
      slug,
      excerpt,
      content,
      category: "Gold Education",
      status: "published",
      metaTitle: `${title} | Capital Gold Buyers`,
      metaDescription: excerpt,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }));

  const initialUsers = [
    { role: "admin" as const, name: process.env.INITIAL_ADMIN_NAME || "Capital Gold Admin", email: process.env.INITIAL_ADMIN_EMAIL, password: process.env.INITIAL_ADMIN_PASSWORD },
    { role: "staff" as const, name: process.env.INITIAL_STAFF_1_NAME || "Staff One", email: process.env.INITIAL_STAFF_1_EMAIL, password: process.env.INITIAL_STAFF_1_PASSWORD },
    { role: "staff" as const, name: process.env.INITIAL_STAFF_2_NAME || "Staff Two", email: process.env.INITIAL_STAFF_2_EMAIL, password: process.env.INITIAL_STAFF_2_PASSWORD },
  ];
  for (const initialUser of initialUsers) await ensureInitialUser(initialUser, now);
}
