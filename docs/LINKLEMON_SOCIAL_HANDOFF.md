# Connections and Heading out — first version

Implemented October 2, 2026. Local review: http://localhost:3001/ . These app changes have not been deployed to getlinklemon.com.

- Home entry points: Heading out and Connections.
- Mutual connection requests by exact account email; recipient accepts or declines in Connections. Pending requests appear in the inbox. No outbound email or phone address-book import.
- Quick outings: place, now or chosen local time within seven days, duration, optional message, selected active groups and accepted connections. Audience review explains shared attendee names and recipient snapshots.
- Recipient identities are resolved in the database from current membership/accepted connections, deduplicated, and saved atomically with in-app notices. No arbitrary recipient IDs or sender IDs can bypass consent.
- Private recipient/host views, coming/not coming, host join notices, cancellation notices, Home quick-outing list, expiry from active lists. Group membership changes after sending do not change the saved audience.
- Inbox filters: All, Groups, Events, Outings, Connections. Quick-outing notices can be marked read. Pending connection notices disappear after response.

Remote additive migration connections_and_quick_outings installed. Four private tables have RLS enabled with no direct authenticated/anon grants; the constrained private operation verifies beta access and actor identity. The public RPC wrapper uses SECURITY INVOKER. Existing public tables/policies/history were preserved.

Validation: production build succeeds; existing 36 Node tests pass. Rollback-only database checks pass for connection consent, mixed group/direct recipient deduplication, repeated joins, cancellation, pending group membership denial, selected-audience isolation, cross-user notice updates, private-table grants, expiry, anon and unapproved accounts. No persisted test requests/outings/notices or external messages. Local browser Home, audience review, Connections and Inbox loaded with no captured console warnings/errors.

Next steps: user reviews the local flow; deploy the reviewed app release; implement real Web Push subscriptions/delivery, per-source notification preferences and quiet hours. Shared connection links, connecting from a group-member profile, blocking, and retrying previously declined connections are not included in this first version. Push is not active; UI explicitly says in-app notifications only.

Database tests use the two known beta accounts and assume an empty new social feature dataset; do not replay against real social records without isolating fixtures first. Every test block uses BEGIN/ROLLBACK. Repairs SQL records the already applied migration and must not be replayed blindly.
