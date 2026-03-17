
PlayCove v4.8.3 — Owner-aware cards, Discover filter, and manage header fix

Included (overwrite these files):
- app/page.js
- app/groups/discover/page.js

Also included (CMD-only helper):
- scripts\run-fix-manage-header.bat  -> removes inline <Header /> from app\groups\[id]\members\page.js

How to apply (Windows CMD):
1) Copy this zip to your project root and unzip:
   tar -xf playcove-v4_8_3.zip

2) (Optional) If your group management page still shows a duplicate header, run:
   scripts\run-fix-manage-header.bat

3) Restart dev:
   npm run dev

Changes:
- Home cards: if you're the owner of an event, "RSVP" becomes "Edit", and "Report" is hidden.
- Discover page: groups you own are hidden.
- Helper script removes duplicate <Header/> on the group management page.
