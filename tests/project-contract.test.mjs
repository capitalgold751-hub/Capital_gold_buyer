import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Vercel project uses Firebase Admin and has no MongoDB or Sites runtime contract", async () => {
  const packageJson = JSON.parse(await source("package.json"));
  assert.equal(packageJson.scripts.build, "next build");
  assert.ok(packageJson.dependencies["firebase-admin"]);
  assert.equal(packageJson.dependencies.mongodb, undefined);
  assert.equal(packageJson.dependencies.vinext, undefined);
  assert.equal(packageJson.dependencies["drizzle-orm"], undefined);
});

test("Firebase Authentication sessions and deny-by-default Firestore client rules are packaged", async () => {
  const login = await source("app/api/auth/login/route.ts");
  const session = await source("app/lib/session.ts");
  const rules = await source("firestore.rules");
  assert.match(login, /createSessionCookie/);
  assert.match(login, /signInWithFirebasePassword/);
  assert.match(session, /verifySessionCookie\(cookie, true\)/);
  assert.match(rules, /allow read, write: if false/);
});

test("server-side RBAC scopes staff data and protects assignment actions", async () => {
  const dashboard = await source("app/api/dashboard/route.ts");
  assert.match(dashboard, /field: "assignedTo", op: "==", value: email/);
  assert.match(dashboard, /requireRole\(identity\.role, "admin"\)/);
  assert.match(dashboard, /This lead is not assigned to your account/);
  assert.match(dashboard, /This appointment is not assigned to your account/);
});

test("customer data gate preserves public rates and protects estimates", async () => {
  const estimate = await source("app/api/estimate-enquiries/route.ts");
  const rates = await source("app/api/rate-enquiries/route.ts");
  assert.match(estimate, /validateName/);
  assert.match(estimate, /normalizeIndianPhone/);
  assert.match(rates, /export async function GET/);
  assert.doesNotMatch(rates, /maybeRefreshLiveGoldRates|syncLiveGoldRates/);
  assert.doesNotMatch(rates, /passwordHash/);
});

test("gold rates sync exactly three times daily and failures alert all active users", async () => {
  const vercel = JSON.parse(await source("vercel.json"));
  assert.deepEqual(vercel.crons, [
    { path: "/api/cron/sync-rates", schedule: "0 4 * * *" },
    { path: "/api/cron/sync-rates", schedule: "0 9 * * *" },
    { path: "/api/cron/sync-rates", schedule: "0 13 * * *" },
  ]);
  const cron = await source("app/api/cron/sync-rates/route.ts");
  const dashboard = await source("app/api/dashboard/route.ts");
  const notifications = await source("app/lib/business-notifications.ts");
  assert.match(cron, /notifyAllActiveUsers/);
  assert.match(dashboard, /action === "sync_live_rates"/);
  assert.match(dashboard, /requireRole\(identity\.role, "admin"\)/);
  assert.match(notifications, /audienceRole: "all"/);
});

test("secrets are represented only as environment variables", async () => {
  const envExample = await source(".env.example");
  assert.match(envExample, /FIREBASE_PROJECT_ID=/);
  assert.match(envExample, /FIREBASE_CLIENT_EMAIL=/);
  assert.match(envExample, /FIREBASE_PRIVATE_KEY=/);
  assert.match(envExample, /FIREBASE_WEB_API_KEY=/);
  assert.match(envExample, /GOLDAPI_KEY=/);
  assert.doesNotMatch(envExample, /mongodb\+srv:/i);
  assert.match(envExample, /^FIREBASE_WEB_API_KEY=$/m);
  assert.match(envExample, /^INITIAL_ADMIN_PASSWORD=$/m);
  assert.match(envExample, /^INITIAL_STAFF_1_PASSWORD=$/m);
  assert.match(envExample, /^INITIAL_STAFF_2_PASSWORD=$/m);
  assert.match(envExample, /^SMTP_PASS=$/m);
  assert.match(envExample, /^GOLDAPI_KEY=$/m);
  assert.match(envExample, /^CRON_SECRET=$/m);
});

test("production branding and configurable business links are packaged", async () => {
  const config = await source("app/lib/site-config.ts");
  const brand = await source("app/components/BrandIdentity.tsx");
  assert.match(config, /https:\/\/capitalgoldbuyers\.in/);
  assert.match(config, /NEXT_PUBLIC_GOOGLE_MAPS_URL/);
  assert.match(config, /NEXT_PUBLIC_INSTAGRAM_URL/);
  assert.match(brand, /capital-gold-logo\.webp/);
});
