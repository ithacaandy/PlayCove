
# PlayCove v4.7.1 — Profile fixes
- Shows avatar frame even before upload
- Replaces alert popups with inline notices
- Uses Auth user_metadata for name/location/bio/avatar
- Header shows avatar chip linking to /account

## Files to overwrite
- app/account/page.js
- app/components/Header.js

## After copying
- Restart dev server to clear route/module cache:
  Windows CMD:
    rmdir /s /q .next
    npm run dev

## Ensure storage is set
- Bucket id: avatars
- Policies:
  - SELECT for anon, authenticated
  - INSERT for authenticated
  - (optional) owner UPDATE/DELETE
