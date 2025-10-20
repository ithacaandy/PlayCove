
PlayCove v4.8.2 — Role‑gated actions on Groups & Discover

This patch enforces:
- Owner of a group → shows Manage + Invite
- Member (not owner) → shows nothing
- Not a member (Discover) → shows Ask to Join
- Owners also see Manage/Invite on their own groups in Discover

Included (overwrite these files):
- app/groups/page.js
- app/groups/discover/page.js

Apply (Windows CMD):
1) Copy this zip to your project root and unzip:
   tar -xf playcove-v4_8_2.zip
2) Restart dev:
   npm run dev
