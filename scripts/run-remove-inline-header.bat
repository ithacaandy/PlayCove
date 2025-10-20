@echo off
setlocal enableextensions enabledelayedexpansion

echo.
echo Removing inline ^<Header />^ imports and JSX (CMD-only)...
echo (Backups will be saved as .bak)
echo.

set TARGETS=app\groups\page.js app\groups\discover\page.js app\mine\page.js app\new\page.js

for %%F in (%TARGETS%) do (
  if exist "%%F" (
    echo Patching %%F
    copy /y "%%F" "%%F.bak" >nul

    rem Filter out import Header lines, <Header /> JSX, and ts-expect-error wrappers
    type "%%F" ^
    | findstr /v /r /c:"^ *import \+Header \+from" /c:"components/Header" ^
    | findstr /v "<Header />" ^
    | findstr /v "@ts-expect-error" > "%%F.tmp"

    move /y "%%F.tmp" "%%F" >nul
  ) else (
    echo Skipping %%F (not found)
  )
)

echo.
echo Done. If anything looks wrong, restore from the .bak files in the same folder.
echo Now restart your dev server:
echo     npm run dev
echo.
pause
