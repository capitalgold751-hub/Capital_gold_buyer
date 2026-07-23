# Firebase Minimal Usage Mode

This build keeps Firebase only for mandatory business data and authentication.

## Firestore retained
- Leads
- Appointments
- Published gold rates
- Branches and blog content only when their dashboard section is opened
- Staff profile management only when staff features are used

## Firestore removed from routine traffic
- Login rate limiting (server-memory rate limiter is used)
- Login audit logs
- Dashboard audit logs
- Analytics events
- Dashboard notification documents
- Realtime dashboard event polling
- Duplicate rate-enquiry documents (the lead itself is the record)
- Follow-up activity duplicate writes
- Gold-rate history duplicate writes

## Dashboard behaviour
- No 15-second or 60-second automatic refresh.
- Data loads once when a dashboard tab is opened.
- Only collections required by the opened tab are queried.
- Use the Refresh button when fresh data is required.

## Public pages
- Blog and branch pages use a one-hour Next.js revalidation cache.
- Public gold rates retain CDN caching and emergency environment-variable fallback rates.
