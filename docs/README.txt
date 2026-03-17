PlayCove v4.5.2 — Hotfix
------------------------

Fixes:
- Removed "use client" from app/layout.js to restore Server Component status.
- Metadata export now valid.
- Added app/ClientShell.js to handle Header and BottomNav visibility.
- Updated app/auth/layout.js to use <main> instead of <html>/<body>.

To apply:
1. Unzip into your project root (overwrite existing layout files).
2. Run: npm run dev
3. Verify that /auth has no header or nav, and metadata works correctly.
