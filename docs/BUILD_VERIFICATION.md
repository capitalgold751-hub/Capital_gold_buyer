# Build Verification Record

Date: 19 July 2026

## Passed in the packaged source

- `npm run lint`
- `npm run typecheck`
- `npm run build` with Next.js 16.2.10 and Firebase Admin SDK 14.2.0
- `node --test tests/*.test.mjs` — 7/7 passed
- `npm audit --omit=dev --audit-level=moderate` — 0 vulnerabilities after the compatible `uuid` security override
- Production route discovery for public site, Firebase authentication, dashboard, SSE, estimate, enquiry, appointment, health and cron APIs
- Local production smoke test: homepage, login, manifest, supplied logo and PWA icon returned HTTP 200; `/api/health` correctly returned HTTP 503 without Firebase credentials
- Contract verification confirms Firebase Admin replaces MongoDB, Firestore client access is deny-by-default, revocable session cookies are checked, staff data is assignment-scoped, three protected daily GoldAPI schedules remain and failures alert all active users
- Firestore rules, composite indexes, TTL field configuration, local checks and idempotent sample/production seed commands are packaged
- Public rate requests read only published Firestore records; GoldAPI access remains limited to protected automation and admin manual sync
- Supplied company logo is packaged as optimized WebP plus 192px, 512px and Apple-touch PWA icons
- Firebase/Vercel/GoDaddy Word handbook rendered to 15 Letter pages and visually inspected for clipping, overflow and table readability
- ZIP integrity, required-file and credential checks are performed when the final archive is created

## Credential-dependent checks still required by the owner

No real Firebase service-account key, Firebase Web API key, GoldAPI key, Gmail App Password, Resend key, Vercel secret or GoDaddy credential is embedded in this package. Complete the live integration, email delivery and role-isolation matrices in `FIREBASE_VERCEL_GODADDY_DEPLOYMENT_GUIDE.md` before accepting production.

Without valid Firebase server variables, `/api/health` must return HTTP 503 and customer APIs must not pretend to have a database connection. With a configured project, deployed Firestore rules/indexes and valid credentials, the acceptance result must be HTTP 200 with `database: connected`.

Existing Atlas data is not copied automatically. If real records exist, they require a separately controlled export, mapping, count reconciliation and Firestore import.
