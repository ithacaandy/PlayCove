
Param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

$targets = @(
  "app\groups\page.js",
  "app\groups\discover\page.js",
  "app\mine\page.js",
  "app\new\page.js"
)

# Match common import forms
$importPattern = '^\s*import\s+Header\s+from\s+["' + "'" + r'].*components/Header["' + "'" + r'];\s*$'
# Match JSX usage
$jsxHeaderPattern = '^\s*<Header\s*/>\s*$'
# Optional ts-expect-error wrapper line
$tsExpectPattern = '^\s*{\s*/\s*@ts-expect-error.*\s*}\s*$'

foreach ($rel in $targets) {
  $path = Join-Path $ProjectRoot $rel
  if (-not (Test-Path $path)) {
    Write-Host "Skip (not found): $rel"
    continue
  }

  $original = Get-Content -Raw -Encoding UTF8 -Path $path

  # Process line by line to remove patterns
  $lines = $original -split "`r?`n"
  $lines = $lines | Where-Object { $_ -notmatch $importPattern }
  $lines = $lines | Where-Object { $_ -notmatch $tsExpectPattern }
  $lines = $lines | Where-Object { $_ -notmatch $jsxHeaderPattern }

  $newText = ($lines -join "`r`n")

  if ($newText -ne $original) {
    Set-Content -Path $path -Value $newText -Encoding UTF8
    Write-Host "Patched: $rel"
  } else {
    Write-Host "No change needed: $rel"
  }
}

Write-Host "Done."
