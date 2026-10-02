# Beta access controls: review and activation

Prepared October 1, 2026. Local application build and 32 regression tests pass. The database controls were approved, passed rollback-only tests, and were applied as remote migration linklemon_beta_access. A second rollback-only test verified the installed controls. The live beta-enabled switch remains false; the application gate is not enabled.

## Installed database change

Review `supabase/repairs/beta_access.sql` before applying it.

- Add two private tables: a beta-enabled switch and the approved tester email list. No client can read or change either table.
- Seed only ithaca.andy@gmail.com and abn48@cornell.edu.
- Check the authenticated user's confirmed email in the Auth database. User-editable profile metadata and submitted email addresses cannot grant access.
- Add a restrictive access policy to the 16 current public tables, preserving their existing ownership and membership rules. Anonymous database access is denied even while the beta switch is off. Server jobs using privileged roles remain unaffected.
- Restrict Storage API access to avatars and event-images to approved accounts once enabled. Public bucket download URLs remain public; this change does not make existing media private.
- Make the event_report_counts view respect underlying row policies.
- Add a beta check to the seven existing privileged invitation and membership/admin functions without replacing their original business rules.
- Expose one boolean-only access check to the application. The access list is never returned.

New public tables, views or privileged functions need the same access review when added. This implementation does not install a global automatic policy for future objects.

## Test before applying

Run the complete SQL inside a transaction that ends in ROLLBACK, temporarily enabling the new switch only inside that transaction. Verify:

1. Both approved account IDs are allowed.
2. An unapproved ID cannot grant itself access through email or user_metadata claims.
3. Anonymous and unapproved accounts cannot read events, profiles or the report-count view.
4. Unapproved accounts cannot call either invitation acceptance or pending-invitation function, receive privileged helper results, or upload an avatar.
5. Both approved accounts retain their normal group, event and invitation behavior, subject to existing ownership rules.
6. No temporary rows, schemas or policies persist after rollback.

Only apply if all checks pass. Apply atomically with the switch disabled, then run security advisors and resolve any new findings. Record the successful remote migration and keep this SQL as its reviewed source.

## Activate

Deploy the application code with LINKLEMON_BETA_GATE_ENABLED initially false. After database verification, enable the private database beta switch and set LINKLEMON_BETA_GATE_ENABLED=true for the intended deployment, then redeploy. Confirm the approved accounts can sign in and an unapproved account reaches the private-beta page and receives no app data through direct database requests.

The domain remains a separate launch step. Google and email sign-in still create/authenticate accounts; authentication alone does not grant beta access. No beta invitation email is sent by these controls.

## Recovery

If an approved account loses access, an authorized database administrator can set linklemon_private.beta_settings.enabled=false and turn off LINKLEMON_BETA_GATE_ENABLED on the deployment. This temporarily restores access for authenticated accounts under the original ownership policies; it does not remove the added policies or restore anonymous data access. Do not delete project data or rewrite Git history to recover.

Adding a tester means inserting their normalized email into the private beta_testers table through an authorized administrative connection. Group/event invitations do not automatically add beta testers.

## Approval status

The owner explicitly approved rollback testing and application of this implementation on October 1, 2026. Both completed successfully. Activation and deployment remain separate next steps. Security advisors reported two informational no-policy notices for the deliberately inaccessible private tables; no new security warnings were introduced. Existing privileged-function, daily-check-in search-path and password-protection warnings remain under review.
