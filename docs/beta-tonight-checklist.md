# LinkLemon beta check — October 2, 2026

Start at https://getlinklemon.com. Test with an approved email address. Use two accounts for invitations and Heading out responses.

1. Sign in with Google, open Account, then sign out and back in. Confirm the avatar is a yellow circle with initials throughout the app.
2. Follow the beta walkthrough on a phone. Install the Home Screen app and enable device alerts if wanted. On iPhone/iPad, test alerts in the installed app.
3. Open Notification settings and enable email. Tap Send test email, then check Inbox and Spam. Confirm the link opens LinkLemon. Record whether it arrives and how long it takes.
4. Connect the two testers or place them in the same group. Post Heading out with a destination, start/end time, and optional message. Check the recipient’s inbox, email, and device alert. Email times currently use Eastern Time.
5. Open the outing and choose I’m in. Confirm Who’s in updates and the host receives the response. View outing in email only opens the app; it does not RSVP automatically.
6. Send a group invite and an event invite to the other registered, email-enabled tester. Accept them and confirm group membership and the event in My Events.
7. Test email Off and a temporary email pause. Separately test the device-alert pause. Updates should remain in the in-app inbox. Resuming should not resend old alerts.
8. Open an email’s unsubscribe link. Viewing the page alone should not turn email off; confirm Unsubscribe and verify Email is off in settings.
9. Create, edit, RSVP to, and cancel a disposable beta event. Confirm cancellation uses the second-press Confirm button and the event is marked cancelled. Check past-event archive and cloning when suitable.

Record the device/browser, action, expected result, actual result, and a screenshot in beta feedback. Do not invite additional testers until their email addresses are approved for beta access.

Email invitations currently reach registered, verified beta accounts that have enabled email. For someone new, share the app link and have them register first. Receiving an actual email and phone push remains a human/device check; a passing build cannot establish delivery.

Release verification: 58 local regression tests passed and the production build passed. Email database role, opt-in, pause, unsubscribe, lease, and invitation-source checks passed inside rollback-only transactions. Existing Supabase advisory warnings remain outside this release: public security-definer helpers and leaked-password protection disabled. The new email tables are intentionally private with no client table policies.
