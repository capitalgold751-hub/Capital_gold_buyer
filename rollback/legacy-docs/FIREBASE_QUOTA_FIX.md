# Firebase quota emergency fix

This copy removes runtime calls to `ensureBaseData()` from login, dashboard auth, public pages, appointments, estimates, and dashboard APIs.

## Important deployment variables

Set these in Vercel:

- `INITIAL_ADMIN_EMAIL` — the real Firebase Authentication admin email.
- `INITIAL_ADMIN_PASSWORD` — only needed for one-time seeding; do not expose it publicly.
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_WEB_API_KEY`
- `ADMIN_NOTIFICATION_EMAILS`
- `FALLBACK_GOLD_RATE_24K`
- `FALLBACK_GOLD_RATE_22K`
- `FALLBACK_GOLD_RATE_18K`

Run seeding only once from a trusted local terminal:

```powershell
npm run firebase:seed:production
```

Do not call `ensureBaseData()` from request routes or pages.

The first login may return `409` saying the secure role was configured. Sign in once more. Login now uses Firebase Authentication/custom claims and does not require a Firestore profile read.
