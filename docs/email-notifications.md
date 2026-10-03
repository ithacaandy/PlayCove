# LinkLemon email notifications

## Behavior

Email is opt-in per account. Enabling it includes group invitations, event invitations, event updates/cancellations, connection requests, and Heading out alerts/responses/cancellations. Heading out activity can be excluded separately. Email has its own Off and pause settings; push preferences and the inbox are unchanged.

Delivery currently targets verified, registered beta accounts that opted in. Invitations to addresses without a registered opted-in account still use the existing shareable link and in-app invitation flow; this release does not automatically email those addresses.

No old notifications are imported. Jobs are checked again before sending. Handled invitations, read notices, expired outings, disabled preferences, changed email addresses, and excluded beta accounts are skipped. Pausing or unsubscribing discards pending jobs; resuming does not replay them. Outing emails expire when the outing ends. Other emails expire after 24 hours.

## Provider and activation

- Verified sending domain: `notify.getlinklemon.com`.
- Sender: `LinkLemon <notifications@notify.getlinklemon.com>`.
- Resend key: sending-only, scoped to that domain; saved as a Production Secret `RESEND_API_KEY` in Vercel. Never commit it or make it `NEXT_PUBLIC_`.
- Delivery remains off unless `LINKLEMON_EMAIL_DELIVERY_ENABLED=true` in production.
- Apply `supabase/repairs/email_delivery.sql` as additive migration `email_delivery`, followed by `supabase/repairs/email_dispatch_scheduler.sql` as `email_dispatch_scheduler`, then run security advisors and the rollback-only database tests.
- Deploy the reviewed commit after Andy's approval. The existing signed minute-by-minute push dispatcher also processes email; no separate scheduler secret is required.
- Enable the production delivery flag before the approved production rebuild. No existing account is opted in automatically.

For the first live check, sign in, enable email in Notification settings, and tap Send test email. This queues only to that account's verified email address and is rate-limited to once per minute. Provider acceptance is not proof of inbox delivery: verify the received email and Resend's delivery status.

## Unsubscribe and replies

Every email has a human-readable unsubscribe link and List-Unsubscribe / List-Unsubscribe-Post headers. GET only opens a confirmation page; email scanners cannot change preferences by visiting a link. Email-client one-click POST uses `/api/email/unsubscribe`. The anonymous HTTP endpoint accepts only a 64-character random capability token, does not reveal account details, and calls a service-only RPC. No login is needed to unsubscribe. The capability can only turn email off.

Invitations and outings open LinkLemon for authenticated responses. Email links do not accept invitations or change RSVP state. The sender does not receive replies; this is stated in the footer.

## Verification

Node tests cover HTML escaping, safe destinations, malformed recipients, unsubscribe headers, idempotent retries, permanent vs transient errors, eligibility, expiration, and dispatch deadlines. Existing app regressions are included.

Database tests run inside a transaction with the proposed schema and ROLLBACK. `tests/email-security.sql` covers opt-in, private tables, roles, leases, pauses, exclusion, unsubscribe and beta authorization. `tests/email-sources.sql` covers invitations, event updates and revoked invitations. They must never be run without a surrounding BEGIN/ROLLBACK. No fixture emails are sent.

Resend requests use a fixed provider URL, one recipient per message, immutable job content and a stable job-based idempotency key. The queue uses leases, up to four attempts, a five-job batch and a delivery time budget. Processing is paced; provider rate limits remain retryable. Provider bounce/complaint suppression is handled by Resend; a separate local webhook dashboard is not included in this version.

Outing emails show the destination in the subject, the date and start/end times in Eastern Time (America/New_York, including daylight saving), and the optional host message when present. Cross-midnight outings show both dates. The View outing button opens the app; it does not RSVP automatically. A saved host time zone is a future improvement for use beyond the initial beta region.
