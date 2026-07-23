# Gold Rate Reliability System

## Included
- GoldAPI sync for 24K, 22K and 18K.
- Previous MongoDB rates remain active when GoldAPI fails.
- Manual dashboard publishing.
- MongoDB `goldRateHistory` audit trail and dashboard trend graphs.
- MongoDB `goldRateSyncStatus` health record.
- Email and WhatsApp alerts on sync failure.
- Six-hour stale-rate health checks with alert cooldown.

## Environment variables
```env
GOLDAPI_KEY=
GOLD_RATE_ADJUSTMENT_PERCENT=95
GOLD_RATE_STALE_HOURS=12
CRON_SECRET=
ADMIN_NOTIFICATION_EMAILS=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
ADMIN_WHATSAPP_NUMBER=91XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://capitalgoldbuyers.in
```

For email alerts, configure either SMTP variables or Resend variables already listed in `.env.example`.

## Local setup
```powershell
npm install
npm run mongo:setup
npm run typecheck
npm run build
npm run dev
```

Open Dashboard > Gold Rates. Use **Sync now from GoldAPI** for a manual test.

## Cron endpoints
Vercel uses `vercel.json` for scheduled GoldAPI updates and stale-rate checks. Both endpoints require `CRON_SECRET` through the `Authorization: Bearer ...` header used by Vercel Cron.

## Collections
- `goldRates`: current published rates.
- `goldRateHistory`: every automatic and manual update.
- `goldRateSyncStatus`: last attempt, last success, failures and alert state.

## Dashboard-managed settings

Admin users can open **Dashboard → Gold Rates** and configure:

- automatic GoldAPI sync on/off
- indicative buying percentage (market-derived price multiplier)
- email alert enable/disable and recipient list
- WhatsApp alert enable/disable and administrator number
- stale-rate threshold and alert cooldown

SMTP/Resend credentials and WhatsApp Cloud API access credentials remain in `.env.local`/Vercel environment variables. They are not exposed in the dashboard.

Staff management remains visible and writable only to administrator accounts under **Dashboard → Staff**.
