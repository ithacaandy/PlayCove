# Home loading preview

Branch: `codex/home-loading-preview`, based on `release/linklemon-preview` at `f0d616b`.

Home starts profile and event reads together, publishes cards before owner names finish, filters RSVP events by date on the server, and keeps one recent account-scoped snapshot in memory. Returning to Home displays the snapshot immediately while refreshing. Sign-out/account changes invalidate pending work and cached data.

Next.js and its ESLint configuration are pinned to 15.5.27. Server cookie reads and their callers now await the Next.js request API; client dynamic routes use `useParams`. The official codemod failed before changing files because its downloaded dependency tree was missing `kleur`; compatibility edits were applied manually and verified by the build.

Validation: 65 Node tests pass, notification-action checks pass, and the optimized build passes with placeholder Supabase values. Existing Supabase Edge runtime warnings remain.

The synthetic benchmark uses 100 ms per mock request: cards approximately 433 ms before and 218 ms after; owner details 327 ms; cached lookup 0.061 ms. This excludes authentication, JavaScript download, rendering, and real Supabase latency. It is not a live performance measurement.

Vercel production tracks `main`; Preview tracks other branches. Preview has public Supabase connection settings and no delivery secrets. `LINKLEMON_BETA_GATE_ENABLED=true` was added for Preview, retaining the existing release-specific override. Production settings were not changed. Preview uses the existing Supabase database, so testing must avoid real data mutations and use clearly labeled fixtures when needed.

Dependency audit is not clean: the production dependency graph still reports 17 findings (12 high, 2 moderate, 3 low), including build tooling, PostCSS, the older Supabase SSR cookie dependency, and WebSocket dependencies. Broader dependency upgrades require a separate compatibility review before production promotion.

The unrelated existing `docs/VERCEL_DEPLOYMENT_AUDIT.md` is preserved outside this change.
