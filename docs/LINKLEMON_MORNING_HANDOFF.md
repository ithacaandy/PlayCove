# LinkLemon: morning handoff

Prepared October 1, 2026 (America/New_York). This checkpoint prepares a limited beta; it is not a public-launch announcement.

## Work completed tonight

- Added Report a problem throughout signed-in app pages. Feedback includes a category, bounded description, reporting account and page path. Query strings and invitation tokens are stripped from automatically attached page context. Reports are saved in public.beta_feedback, not sent as email or GitHub issues.
- Installed and rollback-tested the feedback database policies. Approved testers can submit and read their own reports; other testers cannot read them or impersonate another reporter. Anonymous and unapproved accounts cannot submit.
- Fixed password recovery navigation: the reset email returns through the existing code-exchange callback, and middleware lets the recovery session reach the password form. No password was changed and no recovery email was sent during this work. A real recovery-email test remains for tomorrow.
- Fixed the daily check-in function's mutable search path. Its original behavior passed a rollback-only execution test; existing event timestamps and check-in records were not changed by the test.
- Regression suite: 36 passing tests. Production build succeeds. Applied remote migrations: linklemon_beta_feedback and pin_daily_checkin_search_path. SQL in supabase/repairs records applied changes and must not be blindly replayed.

Feedback review currently happens in the Supabase dashboard using an authorized administrator connection. There is no new in-app administrator inbox or outbound notification yet. Check the feedback table during beta and agree who will own follow-up.

## Backup finding and recovery preparation

The project's Database > Backups page shows the atplay organization on Free and explicitly says Free Plan does not include project backups. No backup was created, no paid upgrade was selected, and restore has not been tested.

Before inviting testers, choose either an approved paid backup option or a manual export process to a private, durable location. For manual exports, use the official Supabase CLI's current db dump documentation and inspect --help before choosing commands. Export schema, data and required roles; ensure the private beta configuration is covered. Separately copy Storage object contents. Keep exports encrypted/restricted, out of Git and away from NEXT_PUBLIC variables. A real restore rehearsal should use an isolated test project, never the active database.

During recovery, stop app writes, identify a verified pre-incident backup, restore to an isolated project first, validate approved-account access and core workflows, then approve the production recovery. Database restores can cause downtime. Database backups contain Storage metadata but do not restore missing image files.

Source: [Supabase database backups](https://supabase.com/docs/guides/platform/backups).

## Domain connection plan for tomorrow

Public DNS inspection found DreamHost nameservers ns1/ns2/ns3.dreamhost.com. No apex A or MX answer was returned in the check, and www.getlinklemon.com did not resolve. Recheck live records before making changes; the DreamHost dashboard is authoritative for the actual zone.

1. Confirm the release and beta gate on the intended production deployment. Main still contains older code; do not deploy it by accident. Set LINKLEMON_BETA_GATE_ENABLED=true in Production before building the intended release. Keep the database beta switch enabled.
2. Approve promotion/production publication of the reviewed release. Verify selected testers can authenticate through their own Google/email accounts without Vercel team membership. Preview protection remains enabled and is unsuitable as the final tester entry point.
3. Add getlinklemon.com and www.getlinklemon.com in Vercel's domain settings. Recommended canonical address: https://getlinklemon.com, with www redirected to it. Confirm the preference before setting redirects.
4. Use the exact A/CNAME values Vercel displays for this project. At DreamHost, change only the required website records; preserve MX/TXT records and nameservers. Do not copy generic IP values from old tutorials. If DreamHost has applied web hosting/parking that conflicts, review its DNS Only option first.
5. Configure Supabase Site URL as the canonical domain. Include the exact callback and its scoped next-query pattern: https://getlinklemon.com/auth/callback and https://getlinklemon.com/auth/callback?next=**. Add the corresponding localhost callback query pattern for local recovery testing. Keep the existing scoped preview entries. Google Cloud's redirect remains https://zwqgzqnmzyeeacrpthyf.supabase.co/auth/v1/callback.
6. Verify DNS, HTTPS, the www redirect, fresh Google sign-in, email recovery, invitation return and denial for an unapproved account on the domain before sending invitations.

No domain, DNS, production branch, deployment-protection or paid-plan changes were made tonight.

Sources: [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [DreamHost custom DNS records](https://help.dreamhost.com/hc/en-us/articles/360035516812-Adding-custom-DNS-records).

## Colleague onboarding

Owner input needed: colleague's GitHub username and beta sign-in email. App access and code access are separate. Add the approved email to the private tester list for app access; approve the repository collaborator invitation for code contribution. Vercel/Supabase administrator or billing access is a separate decision, not required just to test the app or submit code.

After the colleague accepts the repository invitation, clone https://github.com/ithacaandy/PlayCove, use Node 22 LTS, install with npm ci, and create .env.local from .env.example using the public Supabase URL/anon key through the agreed private channel. Do not share passwords or service-role keys. The current database is shared with the beta; prefer an isolated test project before substantial test-data development. Use a feature branch, run node --test tests/*.test.js and npm run build, and open a pull request. Release branch: release/linklemon-preview. Avoid direct pushes to main and never run historical repair SQL automatically.

No colleague invitations or permission grants were sent tonight.

## Beta tester selection and invitations

Start with a small first wave, for example 8–12 adults across 2–3 existing social circles. Include people willing to host and people willing to RSVP, plus iPhone/Android and desktop users. Ask for consent before collecting their email. Family accounts should be owned by adults; do not collect children's contact information.

Maintain a private tester list with name, approved sign-in email, device, invitation status and notes. Add their email to the beta allowlist before sending the launch link. Group/event invitations grant membership or attendance only; they do not grant beta access. Confirm whether Google's OAuth audience is still in Testing and requires adding these Google accounts as test users.

Suggested first tasks: sign in and edit a profile; create/join a group; invite another approved tester; create an event; accept an invitation and confirm it appears in My Events; RSVP/un-RSVP; try recurrence and cloning an archived event; submit feedback. Use clearly labeled beta test events and avoid private child details.

Draft invitation for owner review (not sent):

You're invited to try LinkLemon, our private beta for making plans with nearby families. Once we confirm your approved email, you can sign in at https://getlinklemon.com using that Google or email account. Please try a group, an event and an RSVP, and use Report a problem whenever something feels confusing or doesn't work. This is an early beta, so please keep sensitive family details out of test content. Let us know if you'd like to participate and which email you want to use.

No tester identities were invented and no invitation messages were sent.

## Items deliberately left for tomorrow

- Backup/export location or paid-backup decision; a restore rehearsal.
- DreamHost access and approval of domain/production publication.
- Colleague username, email and permission decisions.
- Tester email list and approval of the invitation message/recipients.
- A fresh unapproved-account browser test, real password-recovery email test and complete two-account browser invitation flow.
- Google OAuth audience/publishing status and privacy/terms content reflecting the actual beta.
- Leaked-password protection is still disabled. Existing callable SECURITY DEFINER warnings remain; beta checks deny unauthorized access, but relocating helpers and changing privilege grants require a separate compatibility review. The two private-table no-policy notices are intentional defense in depth.

Security references: [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [callable privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Hosted verification checkpoint

The overnight preview deployment HDUttggpb8oeAoTNRsjqb6Wqk71X (commit 0a89092) reached Ready. A browser submission displayed the saved confirmation with no browser warnings/errors; the database confirmed the expected reporter and page_path=/invite, without the dummy invitation query token. One clearly labeled automated smoke-test report remains in the queue. After reports from invitation pages, the return link goes home because stripped tokens cannot reopen the invitation. A final follow-up deployment includes that return-link adjustment and this checkpoint.
