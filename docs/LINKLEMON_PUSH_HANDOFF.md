# Push delivery checkpoint

Push is opt-in per signed-in browser session. Account-wide Off and timed pauses suppress all devices while leaving the inbox intact. No catch-up replay. Session existence and beta eligibility are checked before each send. Generic lock-screen text omits names, places, invitation tokens and message contents. Browser permission is requested only by clicking Enable.

Private durable jobs are created for new outings/join/cancel notices, connection requests, group/event invitations, and event updates. Stable device tags deduplicate retries. Provider acceptance is not a guarantee that the OS displays an alert. Jobs expire after ten minutes (or earlier when the outing/invitation expires), retry at most four times, and remove revoked provider subscriptions on 404/410. Currently supports Chrome/Firefox/Safari push services; other services show an unsupported-browser error.

The scheduler wakes the worker after committed queue inserts and retries due work every minute. It is installed DISABLED until activation. Wake requests are debounced for five seconds. No paid scheduler is needed. Keep the worker at https://getlinklemon.com/api/push/dispatch; Preview protection remains on.

## Activation

Save these variables to Vercel Production only: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SUPABASE_SERVICE_ROLE_KEY, PUSH_DISPATCH_SECRET, LINKLEMON_PUSH_DELIVERY_ENABLED=true. All except the public VAPID key are server-only. The service-role key has broad database privileges; never put it in NEXT_PUBLIC variables, logs, source control, or a browser bundle. Save the same dispatch secret in Supabase Vault under linklemon_push_dispatch_secret. Do not print secret values in chat.

Deploy the reviewed feature commit, verify /api/push/dispatch rejects missing credentials, verify settings for an approved user, then set linklemon_private.push_dispatch_config.enabled=true. To stop dispatch, set that flag false and LINKLEMON_PUSH_DELIVERY_ENABLED=false and redeploy. Existing inbox records are unaffected.

For iOS/iPadOS 16.4+, add the HTTPS app to the Home Screen and open it there before enabling push. Each tester controls their own browser permission. Real delivery and phone behavior still require an opted-in device test. No actual provider send was performed during implementation.

## Verification

Node tests cover pause boundaries, provider endpoint/key validation and service-worker navigation safety. tests/push-security.sql uses rollback-only fixtures for private grants, deduplication, pauses, no replay, Off, and sign-out. Full Next.js build required. Database advisors report existing public helper warnings; the new private tables intentionally deny direct client access.

A provider-accepted alert can briefly arrive after a pause is changed; provider TTL is limited to 60 seconds to reduce this window. Fresh jobs always check the current pause before sending.

The settings page keeps Enable disabled until the database dispatcher activation flag is on and required server configuration is present. This avoids asking for device permission before the delivery service is available.
