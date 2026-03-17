
PlayCove v4.8.1 — Remove inline <Header/> on specific pages

This patch runs a safe codemod that deletes:
- `import Header from "…/components/Header"` lines
- `<Header />` JSX lines (and the optional ts-expect-error wrapper)

Targets:
  - app/groups/page.js
  - app/groups/discover/page.js
  - app/mine/page.js
  - app/new/page.js

HOW TO APPLY (Windows CMD):
1) Copy this zip into your project root (next to the `app` folder) and unzip:
   tar -xf playcove-v4_8_1.zip

2) Run the patch:
   scripts\run-remove-inline-header.bat

3) Restart dev server:
   npm run dev

If you have other pages still rendering <Header />, add them to the `$targets` list
inside scripts/remove-inline-header.ps1 and re-run the script.
