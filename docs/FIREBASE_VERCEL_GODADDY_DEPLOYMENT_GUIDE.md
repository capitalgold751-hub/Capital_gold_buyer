# Capital Gold Buyers

## Firebase, GoldAPI, Email, Testing, Vercel and GoDaddy Deployment Guide

Version 2.0 · Firebase migration edition · 19 July 2026

This guide starts from the downloaded ZIP and finishes with a tested production deployment on `capitalgoldbuyers.in`. Follow the sections in order. Do not place any real credential in GitHub, screenshots, chat messages or source files.

## 1. What this application does

| Area | Production behavior |
|---|---|
| Public gold rates | Visitors see the last published Firestore rates without entering personal data. |
| Estimate gate | Name, Indian mobile number and consent are required before the indicative estimate is revealed. |
| Lead capture | Estimates, rate enquiries, contact forms and appointments create Firestore records and alert administrators. |
| Admin workflow | Admin sees every enquiry and appointment, assigns active staff, manages rates, branches, content and accounts. |
| Staff workflow | Staff sees only records assigned to their email and updates follow-up status, notes and next action. |
| Authentication | Firebase Email/Password Authentication, custom role claims and revocable HTTP-only session cookies. |
| Database | Cloud Firestore stores operational records; direct browser Firestore access is denied. |
| Rate automation | GoldAPI is called by three protected schedules each day and by the admin-only manual action. |
| Failure protection | Failed GoldAPI refreshes preserve the last published rate and alert all active admin/staff accounts. |
| Notifications | Dashboard alerts always work when Firestore works. Gmail SMTP and optional Resend add email delivery. |
| PWA | Manifest, service worker, branded icons and a short mobile installation prompt are included. |

Workflow:

`Visitor submits → server validates → Firestore saves → admin receives alert → admin assigns staff → staff follows up → status/note updates → admin monitors conversion and audit history`

## 2. Security decisions already implemented

- Firebase Admin SDK runs only in Next.js server routes.
- `firestore.rules` denies every direct client read and write.
- Firebase session cookies are HTTP-only, secure in production and verified with revocation checks.
- The Firebase custom claim and Firestore profile must agree on `admin` or `staff` role.
- Staff queries are scoped to their assigned email; mutation endpoints repeat the ownership check.
- Admin-only actions re-check the role on the server.
- Password changes, resets and account disable actions revoke Firebase refresh tokens.
- Login/submission rate limits are atomic Firestore transactions.
- Customer forms use validation, consent, honeypots and safe error messages.
- Dashboard responses use private no-cache headers and are excluded from indexing.
- GoldAPI, Firebase service-account and email secrets never enter browser JavaScript.
- PWA caching excludes protected APIs and customer data.

Firebase documents the Admin SDK setup at <https://firebase.google.com/docs/admin/setup> and revocable session cookies at <https://firebase.google.com/docs/auth/admin/manage-cookies>.

## 3. Prerequisites

Create or obtain:

1. Node.js 22 LTS and npm.
2. A Google account that can manage Firebase and Google Cloud IAM.
3. A Firebase project.
4. A Vercel account and a plan capable of the required Cron frequency.
5. The GoDaddy account controlling `capitalgoldbuyers.in`.
6. A rotated GoldAPI key.
7. The Gmail account `capitalgold751@gmail.com` with two-step verification.
8. Git and a private GitHub repository, or the Vercel CLI.

Important credential cleanup:

- The previously shared Atlas connection is no longer used by this application. Delete or rotate its old database user anyway.
- Rotate the previously shared GoldAPI key before production.
- Never send the Firebase service-account JSON file to another person through chat or email.

Data-migration boundary: this package completely replaces the application backend, but it does not automatically copy existing Atlas records. If the old database contains real leads, appointments or audit history, freeze writes, export the records, map them to the Firestore data model, validate counts and ownership, and import them in a separate controlled migration before launch.

## 4. Create the Firebase project

1. Open <https://console.firebase.google.com/>.
2. Select **Create a project**.
3. Use a clear name such as `Capital Gold Buyers Production`.
4. Carefully choose the generated project ID. The project ID cannot be changed later.
5. Google Analytics is optional because this application already has operational analytics. It can be enabled later.
6. Finish project creation.

Record the project ID as `FIREBASE_PROJECT_ID`.

### Create Cloud Firestore

1. Firebase Console → **Build** → **Firestore Database**.
2. Select **Create database**.
3. Use Firestore Native mode.
4. Select a production location near the primary customers and Vercel functions. Location choice is difficult or impossible to change later, so confirm it before continuing.
5. Choose production mode. The repository rules will replace the temporary rules.
6. Wait until the database is ready.

The project uses the default database. Keep:

```env
FIRESTORE_DATABASE_ID=(default)
```

### Enable Firebase Email/Password Authentication

1. Firebase Console → **Build** → **Authentication**.
2. Select **Get started**.
3. Open **Sign-in method**.
4. Enable **Email/Password**.
5. Do not enable anonymous authentication.
6. Authentication → **Settings** → **Authorized domains**.
7. Add `capitalgoldbuyers.in` and `www.capitalgoldbuyers.in`.
8. Keep `localhost` for development.

### Register a Firebase web application

The browser does not connect directly to Firestore, but the server uses Firebase's email/password sign-in endpoint to obtain a fresh ID token.

1. Firebase Project settings → **General**.
2. Under **Your apps**, select the web icon.
3. Register a name such as `capital-gold-buyers-web`.
4. Firebase Hosting is not required because Vercel hosts this project.
5. Copy the displayed `apiKey` value to `FIREBASE_WEB_API_KEY`.

The Firebase Web API key is an application identifier, not a service-account private key. Keep it in environment configuration to avoid accidental project mix-ups.

### Generate the Admin SDK service account

1. Firebase Project settings → **Service accounts**.
2. Select **Firebase Admin SDK**.
3. Select **Generate new private key** and confirm.
4. A JSON file downloads once. Store it securely.
5. Read only these fields:

| JSON field | Environment variable |
|---|---|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

Never copy the JSON file into `public`, GitHub or the deployment ZIP. If exposed, delete that key from Google Cloud IAM and generate a replacement.

## 5. Configure the local project

Extract the ZIP and open PowerShell in the inner `capital-gold-buyers` directory.

```powershell
npm install
Copy-Item .env.example .env.local
```

Open `.env.local`. Configure the Firebase section:

```env
FIREBASE_PROJECT_ID=your-real-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-real-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nPASTE_THE_KEY_BODY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
FIRESTORE_DATABASE_ID=(default)
SESSION_HOURS=12
```

Private-key rules:

- Keep it on one quoted line in `.env.local`.
- Replace real line breaks with literal `\n` characters if necessary.
- Do not add spaces before or after the key.
- Do not commit `.env.local`.

Configure initial production users with unique strong passwords:

```env
INITIAL_ADMIN_NAME=Capital Gold Admin
INITIAL_ADMIN_EMAIL=your-admin-email@example.com
INITIAL_ADMIN_PASSWORD=
INITIAL_STAFF_1_NAME=Staff One
INITIAL_STAFF_1_EMAIL=staff-one@example.com
INITIAL_STAFF_1_PASSWORD=
INITIAL_STAFF_2_NAME=Staff Two
INITIAL_STAFF_2_EMAIL=staff-two@example.com
INITIAL_STAFF_2_PASSWORD=
```

Passwords must contain 12–128 characters with uppercase, lowercase, number and special character. Never reuse the Firebase/Google account password.

## 6. Deploy Firestore rules, indexes and TTL configuration

The package includes:

- `firebase.json`
- `.firebaserc.example`
- `firestore.rules`
- `firestore.indexes.json`

Run:

```powershell
npx firebase-tools login
Copy-Item .firebaserc.example .firebaserc
```

Edit `.firebaserc` and replace `your-firebase-project-id`. Confirm the selected project:

```powershell
npx firebase-tools projects:list
npx firebase-tools use your-firebase-project-id
npx firebase-tools deploy --only firestore
```

The deploy creates the composite indexes needed for assigned leads, assigned appointments, public blog ordering and rate-limit queries. It also configures TTL cleanup for expired login/submission limit buckets.

Firestore indexes can take several minutes to build. Wait until Firebase Console → Firestore → **Indexes** shows every required index as enabled.

Firebase recommends keeping rules and indexes under version control and deploying them with the CLI: <https://firebase.google.com/docs/firestore/security/get-started> and <https://firebase.google.com/docs/firestore/query-data/indexing>.

## 7. Verify Firebase and seed data

Run:

```powershell
npm run firebase:check
```

Expected shape:

```json
{
  "database": "(default)",
  "connected": true,
  "provider": "Cloud Firestore",
  "collections": {
    "users": 3,
    "rates": 3,
    "branches": 1,
    "leads": 0,
    "appointments": 0
  }
}
```

Counts vary when you already have data. This command also creates base rates, the first branch, starter blogs and any configured initial accounts.

### Sample development data

For local testing only:

```powershell
npm run firebase:seed
```

This creates three Firebase Authentication demo accounts and matching Firestore profiles:

- `admin.demo@capitalgoldbuyers.in` / `AdminDemo@12345`
- `staff1.demo@capitalgoldbuyers.in` / `StaffOneDemo@12345`
- `staff2.demo@capitalgoldbuyers.in` / `StaffTwoDemo@12345`

It also adds sample leads, an appointment and a rate enquiry. Do not run this command against production. Delete demo Authentication users and matching `users` documents before launch.

For production base data only:

```powershell
npm run firebase:seed:production
```

Immediately after successful production seeding:

1. Remove every `INITIAL_*_PASSWORD` value from `.env.local` and Vercel.
2. Redeploy.
3. Sign in to each account and change its password.
4. Verify old sessions are revoked.

## 8. Firestore data model

| Collection | Purpose |
|---|---|
| `users` | Server-side account profile, role, active status and last login. Document ID equals Firebase UID. |
| `goldRates` | Current 18K/22K/24K public rates. |
| `goldRateHistory` | Immutable rate snapshots for audit/reporting. |
| `rateEnquiries` | Customer rate and estimate unlock submissions. |
| `leads` | Central admin/staff sales workflow. |
| `followUpActivities` | Follow-up history for lead actions. |
| `appointments` | Appointment request, assignment and completion status. |
| `branches` | Branch address, contact, hours and maps settings. |
| `blogPosts` | SEO blog CMS content. |
| `notifications` | Admin, all-user and assigned-user alerts. |
| `analyticsEvents` | First-party operational conversion events. |
| `auditLogs` | Authentication and dashboard mutation audit trail. |
| `loginAttempts` | Atomic login-rate-limit buckets with TTL. |
| `submissionLimits` | Atomic public-form-rate-limit buckets with TTL. |

Do not manually change `firebaseUid`, account emails or roles in only one system. Use the admin dashboard so Firebase Authentication claims and the Firestore profile stay synchronized.

## 9. Authentication and RBAC acceptance test

Start locally:

```powershell
npm run dev
```

Test in this order:

1. Open `/login`.
2. Choose Admin Login and sign in with an administrator.
3. Confirm admin can see leads, appointments, staff, rates, branches, blog, analytics and audit history.
4. Add a temporary staff account from the dashboard.
5. Sign out and choose Staff Login.
6. Confirm staff cannot see unassigned leads, other staff records, rate management, CMS or account administration.
7. Admin assigns a lead to that staff email.
8. Staff refreshes and sees the assignment.
9. Staff changes status, notes and next follow-up.
10. Admin sees the update and audit entry.
11. Admin disables the staff account.
12. Confirm its existing session is rejected and new login fails.
13. Re-enable it, reset its password and verify the old password/session no longer works.

Firebase session cookies contain the role claim and are verified with `checkRevoked=true`. Firestore profile role and active state are checked again before every protected operation.

## 10. Customer lead-generation acceptance test

Use test contact information:

1. Public rates load without a name or phone number.
2. Open the estimate calculator.
3. Enter weight/purity first; confirm the value remains hidden.
4. Enter valid name, Indian mobile number and consent.
5. Submit; confirm the estimate appears.
6. Admin dashboard receives the enquiry and a high-priority lead.
7. Submit a contact enquiry; confirm it enters the admin queue.
8. Book an appointment; confirm both a lead and appointment are created unassigned.
9. Assign them to Staff 1 and Staff 2.
10. Confirm each staff account sees only its own assignments.

Delete or clearly mark test customer data before production launch.

## 11. Configure GoldAPI

Rotate the previously shared key and set only the new value:

```env
GOLDAPI_KEY=
GOLD_RATE_ADJUSTMENT_PERCENT=95
```

Behavior:

- GoldAPI returns XAU/INR per troy ounce.
- Server code converts to price per gram and purity-adjusted 24K, 22K and 18K rates.
- The configured adjustment is applied before publishing.
- Public rate requests read Firestore only and never consume GoldAPI quota.
- Admin can trigger a protected manual sync.
- Three protected Vercel schedules refresh automatically.
- If GoldAPI fails, the last published Firestore rates remain available.
- Failure creates one cooldown-protected alert for all active users and attempts email delivery.

Do not prefix the key with `NEXT_PUBLIC_`.

## 12. Configure Gmail notifications

For `capitalgold751@gmail.com`:

1. Enable Google two-step verification.
2. Create a Google App Password.
3. Store the generated app password in `SMTP_PASS`; do not use the normal Gmail password.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=capitalgold751@gmail.com
SMTP_PASS=
SMTP_FROM=Capital Gold Buyers <capitalgold751@gmail.com>
ADMIN_NOTIFICATION_EMAILS=capitalgold751@gmail.com
```

Optional Resend fallback:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=Capital Gold Buyers <alerts@capitalgoldbuyers.in>
```

Dashboard notifications do not depend on email delivery.

## 13. Run pre-deployment quality checks

```powershell
npm run lint
npm run typecheck
npm run build
npm test
npm audit --omit=dev --audit-level=moderate
```

All must finish successfully. Then run:

```powershell
npm run firebase:check
```

Do not continue to production if rules/index deployment, build, Firebase check or authentication tests fail.

## 14. Deploy to Vercel

### GitHub method

1. Create a private GitHub repository.
2. Confirm `.env.local`, service-account JSON, `.firebaserc` and secrets are ignored.
3. Commit and push the application.
4. Vercel → **Add New Project** → import the repository.
5. Framework: Next.js.
6. Build command: `npm run build`.
7. Install command: `npm install`.
8. Add every required environment variable before the first production deployment.

### Required Vercel environment variables

| Variable | Value/purpose |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project ID. |
| `FIREBASE_CLIENT_EMAIL` | Admin SDK service-account client email. |
| `FIREBASE_PRIVATE_KEY` | Entire service-account private key; raw multiline or quoted `\n` format. |
| `FIREBASE_WEB_API_KEY` | Firebase web application API key used by server-side password sign-in. |
| `FIRESTORE_DATABASE_ID` | `(default)` unless intentionally using another database. |
| `SESSION_HOURS` | `12` recommended. |
| `NEXT_PUBLIC_SITE_URL` | `https://capitalgoldbuyers.in` |
| Company/map/social variables | Copy the desired values from `.env.example`. |
| `CRON_SECRET` | New random secret used only for scheduled route authorization. |
| `GOLDAPI_KEY` | Rotated production GoldAPI key. |
| `GOLD_RATE_ADJUSTMENT_PERCENT` | Business payout adjustment. |
| SMTP/Resend variables | Notification delivery configuration. |
| `ADMIN_NOTIFICATION_EMAILS` | Admin alert recipients. |
| `INITIAL_*` | Use only for first account creation, then remove passwords. |

Generate `CRON_SECRET` locally:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Do not reuse a Firebase, email or GoldAPI credential as the cron secret.

### Vercel Cron schedules

`vercel.json` contains:

| UTC | IST | Purpose |
|---|---|---|
| `0 4 * * *` | 9:30 AM | Morning rate update |
| `0 9 * * *` | 2:30 PM | Afternoon rate update |
| `0 13 * * *` | 6:30 PM | Evening rate update |

Vercel automatically sends `CRON_SECRET` as a Bearer token. Three executions per day require a Vercel plan that supports that frequency; Hobby permits one cron invocation per day. See <https://vercel.com/docs/cron-jobs/manage-cron-jobs>.

## 15. Connect the GoDaddy domain

In Vercel:

1. Project → Settings → Domains.
2. Add `capitalgoldbuyers.in`.
3. Add `www.capitalgoldbuyers.in`.
4. Choose the apex domain as primary and redirect `www`, or the reverse, but use one canonical host consistently.
5. Vercel shows the exact required DNS records.

In GoDaddy:

1. Open the domain → DNS → Manage DNS.
2. Remove only records that conflict with the hostnames Vercel requested.
3. Add the exact A/CNAME records shown by Vercel.
4. Do not delete MX/TXT records used by email.
5. Wait for DNS propagation.

Verify:

- `https://capitalgoldbuyers.in`
- `https://www.capitalgoldbuyers.in` redirects correctly
- TLS certificate is valid
- `/api/health` returns HTTP 200
- manifest and PWA icons return HTTP 200

## 16. Production test matrix

### Infrastructure

- [ ] Firebase project ID is correct.
- [ ] Firestore rules show deny-by-default client access.
- [ ] Required indexes are enabled.
- [ ] `npm run firebase:check` succeeds with production credentials.
- [ ] Email/Password provider is enabled.
- [ ] Service-account key exists only in approved secret storage.
- [ ] Vercel `/api/health` reports `database: connected`.

### Authentication

- [ ] Admin login succeeds only on Admin Login.
- [ ] Staff login succeeds only on Staff Login.
- [ ] Wrong password returns a generic error.
- [ ] Repeated failures trigger rate limiting.
- [ ] Disabled accounts cannot continue using existing sessions.
- [ ] Password reset revokes old sessions.
- [ ] Direct Firestore browser reads/writes are denied.

### Leads and appointments

- [ ] Public rates require no identity.
- [ ] Estimate requires name, phone and consent.
- [ ] Contact/estimate/rate/appointment submissions reach admin.
- [ ] Admin assignment reaches the chosen staff account.
- [ ] Staff cannot access another staff member's record by changing request data.
- [ ] Follow-up updates appear to admin and create audit history.

### Rates and alerts

- [ ] Admin manual sync succeeds with the new GoldAPI key.
- [ ] Staff cannot run manual sync.
- [ ] Cron route rejects requests without the Bearer secret.
- [ ] Three Vercel schedules appear on the selected plan.
- [ ] Simulated API failure preserves the last rates.
- [ ] Failure alerts appear for admin and both staff users.
- [ ] Gmail or Resend delivery is confirmed.

### PWA, UX and SEO

- [ ] Mobile install prompt appears briefly when installation is available.
- [ ] Browser installation works over production HTTPS.
- [ ] Logo and cinematic imagery load without alt-text placeholders.
- [ ] Dashboard/customer data is not cached offline.
- [ ] Canonical URL, sitemap, robots and schema reference the production domain.
- [ ] Google Search Console ownership and sitemap submission are complete.

## 17. Security, privacy and operations

Before accepting real customer information:

1. Publish privacy, terms and consent wording reviewed for the business jurisdiction.
2. Define who may export or delete leads.
3. Establish retention periods for enquiries, appointments, analytics and audit records.
4. Review Firebase IAM monthly and remove unused owners/service accounts.
5. Rotate service-account keys immediately after suspected exposure.
6. Enable Google account two-step verification for every privileged user.
7. Monitor Firebase Authentication activity, Firestore usage and Vercel Function logs.
8. Set Firebase/Google Cloud budget alerts.
9. Export or back up Firestore on a documented schedule appropriate to business risk.
10. Never log customer phone numbers, session cookies or secrets in diagnostics.

The server-side Admin SDK bypasses Firestore Security Rules by design. Therefore service-account protection and application RBAC are both critical.

## 18. Troubleshooting

### `FIREBASE_PROJECT_ID is not configured`

The command did not load `.env.local`, the file is named incorrectly or the variable is blank. On Windows, ensure the filename is `.env.local`, not `.env.local.txt`.

### `Failed to parse private key` or `Invalid PEM formatted message`

- Copy the `private_key` field from the correct service-account JSON.
- Keep BEGIN/END lines.
- Use quoted literal `\n` characters in `.env.local`.
- Remove accidental spaces.
- On Vercel, paste the entire value into one environment variable and redeploy.

### `Firebase Email/Password authentication is not enabled`

Firebase Console → Authentication → Sign-in method → enable Email/Password. Confirm `FIREBASE_WEB_API_KEY` belongs to the same project as the service account.

### `auth/invalid-credential` or permission errors

Confirm project ID, service-account client email and private key all came from the same JSON file. Generate a fresh key if the old key was deleted or disabled.

### `FAILED_PRECONDITION: The query requires an index`

Run:

```powershell
npx firebase-tools use your-firebase-project-id
npx firebase-tools deploy --only firestore:indexes
```

Wait for index status to become enabled, then retry.

### Dashboard login works once, then session is rejected

Check that the Firestore `users/{uid}` role and active status match the Firebase custom claim. Use admin account management or rerun production seeding for the configured initial account. Password/reset/disable actions intentionally revoke sessions.

### `/api/health` returns 503

Check Vercel Function logs for configuration categories, but never print the private key. Verify Firestore exists, the service account is valid and `FIRESTORE_DATABASE_ID` matches.

### GoldAPI fails

Verify the rotated key, quota and XAU/INR access. Firestore's last published rates remain active. Admin and active staff should receive dashboard alerts.

### Email fails but dashboard notifications work

Verify Google two-step verification, App Password, SMTP host/port and sender. If Gmail blocks delivery, configure the verified Resend fallback.

### PWA shows only “Add to desktop”

Installation UI depends on browser/platform eligibility. Confirm HTTPS, manifest, 192/512 icons, service-worker registration and no private/incognito restrictions. The site listens for the install event and offers a direct install action where supported; iOS uses Add to Home Screen.

## 19. Final go-live checklist

- [ ] Previously shared Atlas/GoldAPI credentials rotated or revoked.
- [ ] Firebase Email/Password provider enabled.
- [ ] Firestore database location approved.
- [ ] Rules/indexes/TTL deployed.
- [ ] Production admin and two staff accounts created.
- [ ] All `INITIAL_*_PASSWORD` variables removed after seeding.
- [ ] Demo Firebase users and demo Firestore documents removed.
- [ ] Admin/staff isolation tests passed.
- [ ] Customer lead and appointment flows passed.
- [ ] GoldAPI success and failure paths passed.
- [ ] Email delivery passed.
- [ ] Vercel plan supports three daily schedules or an approved external scheduler is configured.
- [ ] GoDaddy apex and `www` DNS are verified.
- [ ] HTTPS, PWA install, health endpoint and SEO files passed.
- [ ] Privacy, retention, access and incident-response owners are assigned.

Only then begin accepting production enquiries.
