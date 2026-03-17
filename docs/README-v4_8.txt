
PlayCove v4.8 — Design pass + BottomNav polish

Included:
- app/globals.css
- app/components/BottomNav.js

Apply (Windows CMD):
1) cd C:\Users\ithac\Documents\atplay
2) tar -xf playcove-v4_8.zip
3) Remove any duplicate <Header/> rendered inside pages:
   findstr /s /n /i "<Header" app\*.js app\*.jsx app\*.tsx
   (Delete the import and the JSX; layout provides the fixed header.)
4) npm run dev
