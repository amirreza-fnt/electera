# Bump asset ?v= on all HTML, commit, push to origin main.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/push.ps1 -Message "your commit message"

param(
  [Parameter(Mandatory = $true)]
  [string]$Message
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  & git -c "safe.directory=$($root -replace '\\','/')" @GitArgs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$version = Get-Date -Format "yyyyMMddHHmmss"
Set-Content -Path (Join-Path $root ".build-version") -Value $version -Encoding ascii -NoNewline

$htmlFiles = Get-ChildItem -Path $root -Filter "*.html" -File
$utf8 = New-Object System.Text.UTF8Encoding $false

foreach ($f in $htmlFiles) {
  $c = [System.IO.File]::ReadAllText($f.FullName, $utf8)
  $c = [regex]::Replace($c, '(href="css/[^"?]+\.css)(\?v=[^"]*)?(")', "`${1}?v=$version`${3}")
  $c = [regex]::Replace($c, '(src="js/[^"?]+\.js)(\?v=[^"]*)?(")', "`${1}?v=$version`${3}")
  if ($c -notmatch 'meta name="asset-version"') {
    $c = $c -replace '(<meta charset="UTF-8"\s*/>)', "`$1`r`n  <meta name=`"asset-version`" content=`"$version`" />"
  } else {
    $c = [regex]::Replace($c, 'content="[0-9]{14}"', "content=`"$version`"")
  }
  if ($c -notmatch 'http-equiv="Cache-Control"') {
    $c = $c -replace '(<meta name="viewport"[^>]+>)', "`$1`r`n  <meta http-equiv=`"Cache-Control`" content=`"no-cache, must-revalidate`" />"
  }
  [System.IO.File]::WriteAllText($f.FullName, $c, $utf8)
}

Invoke-Git add -A
$status = (& git -c "safe.directory=$($root -replace '\\','/')" status --porcelain) | Out-String
if ($status.Trim().Length -eq 0) {
  Write-Host "Nothing to commit."
  exit 0
}

Invoke-Git commit -m $Message
Invoke-Git push origin main

Write-Host ""
Write-Host "Pushed. asset v=$version"
Write-Host "https://amirreza-fnt.github.io/electera/harmony-home.html"
