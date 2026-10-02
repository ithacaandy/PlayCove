# LinkLemon limited beta launch checklist

Status recorded October 1, 2026. This is a preparation checklist, not confirmation that the beta is live.

## Confirmed
- Release branch: release/linklemon-preview. Main and existing Git history are preserved.
- Vercel preview builds successfully; Google login and logout were confirmed by the owner.
- Regression suite: 29 passing tests at the latest release checkpoint.
- Invitation recipient checks, expiry, group acceptance and RSVP writes passed rollback-only database checks. Test rows did not persist.
- Hosted forms and event attendance display were reviewed. A complete two-account browser invitation test remains open.

## Before sharing the beta
1. Restrict access to selected testers using verified account identity. A page-only gate is insufficient: direct database access, storage policies and invitation functions must enforce the same restriction. Keep Google and email sign-in available.
2. Add a simple authenticated Report a problem entry point with confirmation and clear handling of submitted feedback. Avoid collecting credentials or invitation tokens.
3. Verify actual backup availability and a recovery/export procedure. Do not assume the current plan includes automatic backups. Storage objects need separate consideration from database records.
4. Review outstanding database security advisories, password-reset redirects, storage permissions and privacy/terms content.
5. Confirm one fresh invitation flow with two tester accounts, including acceptance and appearance in My Events. Broader usability, RSVP and recurrence testing can continue during beta.
6. Prepare the production deployment and domain settings. Preserve DreamHost email/MX records. Configure the canonical domain and Supabase callback allowlist, including the app's next query parameter, then verify Google login on the domain.

## Current constraints
- Preview and local development share the existing Supabase database. Tester actions will affect that database.
- Vercel preview protection currently requires Vercel login. Selected testers should instead use their own LinkLemon Google/email accounts on an appropriately gated deployment.
- No domain has been attached as part of this checklist. No production deployment, paid plan, collaborator invitation or backup guarantee is implied.
- New database controls must preserve access for the owner and existing approved test account, and must be tested before activation.

## Owner input needed
- Initial tester email list and any changes to the two existing approved accounts.
- Who should receive/review beta feedback.
- Final production/domain approval after the access controls and deployment are reviewable.
