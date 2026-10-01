# PlayCove handoff — September 30, 2026

Independent review completed: sign-in return paths are restricted to local pages; sign-up no longer writes/overwrites a profile before a confirmed session; RSVP joins and cancellations share checked error handling; legacy RSVP endpoint uses the database capacity guard instead of incomplete attendee counts; event editing shares creation validation, preserves age zero, verifies a row was updated, and handles failed loads; event creation retains success feedback/link and blocks duplicate submissions after saving.

The server-based sign-out implementation is built. Signed-out access redirects to Sign In. Actual sign-out after a fresh login and second-account RSVP/cancellation still need browser verification. Existing tabs repeatedly timed out during browser inspection; opening a new tab restored access. The precise cause of those tab stalls is not proven.

Items deferred for owner review:
- Group invitations and acceptance require a separate authorization audit; existing invite routes and acceptance behavior have not been changed.
- Live group-members INSERT policies should be reviewed for role restriction, and group-event write policies should be reviewed to align with application checks. No live policy changes made during this independent review.
- Existing Supabase security advisor warnings: mutable search_path for daily check-in, publicly callable membership/admin SECURITY DEFINER helpers, and leaked-password protection disabled. No changes made to these settings.
- Discover RSVP totals may be incomplete for non-hosts under current RLS. A privacy-preserving count needs a reviewed live database change; existing Discover redesign was preserved.
- Some older avatar URLs refer to the inactive Supabase project. Migrating old images or replacing profile URLs needs a source-of-truth decision; existing user data was preserved.

Changes are uncommitted. No files were deleted and no Git history rewritten. Live data was not changed in this review.