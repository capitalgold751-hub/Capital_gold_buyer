# Dashboard Settings Update

Added administrator-only controls under Dashboard → Gold Rates:

- Enable/disable automatic GoldAPI synchronization
- Select indicative buying-rate percentage
- Enable/disable email failure and stale-rate alerts
- Configure one or more administrator alert email addresses
- Enable/disable WhatsApp administrator alerts
- Configure WhatsApp administrator number
- Configure stale-rate threshold
- Configure alert cooldown interval

Staff management remains restricted to administrator accounts under Dashboard → Staff. Administrators can create admin/staff accounts, reset passwords, and enable/disable accounts.

Security note: SMTP, Resend and WhatsApp Cloud API credentials are still read only from environment variables and are never exposed through the dashboard.
