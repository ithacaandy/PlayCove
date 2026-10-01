# LinkLemon: deployment and shared development

The existing PlayCove repository and Supabase project remain the source of truth. Branding changes do not rename database objects or rewrite Git history.

## Local development
Use Node 22 LTS and `npm ci`, then `npm run dev`. Copy `.env.example` to `.env.local` and obtain values through a private channel. Never commit credentials.

## Vercel
Import ithacaandy/PlayCove as a Next.js project. Use `npm run build` and framework-managed output. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the existing Supabase project. The anon/publishable key is public by design; never substitute a service-role key. Add variables separately to Production and Preview, and redeploy after changes. Do not point experimental preview deployments at production data without considering their writes; use a separate test Supabase project for shared development when practical.

Deploy only after reviewing and committing the current local changes. Importing the repository currently uses older code until these changes are pushed. Verify the preview before attaching getlinklemon.com. In Vercel Domains, add getlinklemon.com and follow its exact DNS instructions at DreamHost; preserve email/MX records. Choose one canonical www/non-www address. No hosting plan is needed at DreamHost for domain registration alone.

## Google sign-in
Google OAuth redirect URI: https://zwqgzqnmzyeeacrpthyf.supabase.co/auth/v1/callback
Supabase redirect allowlist: http://localhost:3000/auth/callback and https://getlinklemon.com/auth/callback. Add the exact approved Vercel preview callback URL when testing there. The app preserves local next destinations, including invitation tokens, and exchanges the OAuth code into cookies. Keep nonce checks enabled. Google client secret belongs only in Supabase provider settings. Configure only openid, email and profile scopes. Add intended test accounts to Google's Audience if the app is still in Testing. Set the Supabase Site URL to the canonical production domain when deployment is ready.

## Collaboration
Invite your colleague's GitHub account after explicit approval. Each person clones the repository and uses a separate feature branch; open pull requests for review. Avoid sharing passwords or directly editing the deployed server. Vercel previews provide review links. Team permissions and any paid plan require approval. Run `node --test tests/*.test.js` and `npm run build` before merging. SQL in supabase/repairs records changes already applied to the active project; do not blindly replay them. Keep database changes reviewed and use migrations for new environments.

## Remaining launch checks
Confirm Google login with a real test account, invitation return flow, production URLs, Supabase email templates, password-reset redirects, storage permissions and existing database security advisories. Privacy policy and terms must reflect the actual service before launch.

## Release checkpoint — October 1, 2026
Google sign-in was verified locally by the owner. The current release includes LinkLemon branding, supplied navigation icons, invitation inbox, group membership controls, event recurrence and archives, and host cancellation notices. Regression suite: 29 passing tests. Historical PLAYCOVE_HANDOFF.md describes an earlier review; later fixes supersede its deferred invitation and policy items. Legacy avatar migration and existing security advisories still need review.

Use a non-production release branch for the first Vercel preview. Before testing the preview, configure its environment variables and allow its exact /auth/callback URL in Supabase. Check sign-in, invitation acceptance, event creation, RSVP, archive and notification flows there. Merging to the production branch can trigger a production deployment automatically.
