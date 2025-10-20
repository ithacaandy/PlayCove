
@echo off
setlocal enableextensions enabledelayedexpansion

echo.
echo Removing inline ^<Header />^ from group management page (CMD-only)...
echo (Backup will be saved as .bak)
echo.

set TARGET=app\groups\[id]\members\page.js

if exist "%TARGET%" (
  echo Patching %TARGET%
  copy /y "%TARGET%" "%TARGET%.bak" >nul

  type "%TARGET%" ^
  | findstr /v /r /c:"^ *import \+Header \+from" /c:"components/Header" ^
  | findstr /v "<Header />" ^
  | findstr /v "@ts-expect-error" > "%TARGET%.tmp"

  move /y "%TARGET%.tmp" "%TARGET%" >nul
) else (
  echo Skipping (not found): %TARGET%
)

echo.
echo Done. Restart your dev server:
echo     npm run dev
echo.
pause
