# Publish this folder to GitHub Pages (run after: gh auth login)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/publish-github-pages.ps1

$ErrorActionPreference = "Stop"
$RepoName = "electera"
$Owner = "amirreza-fnt"

if (-not (gh auth status 2>$null)) {
  Write-Host "First run: gh auth login -h github.com -p https -w"
  exit 1
}

$User = gh api user -q .login
Write-Host "GitHub user: $User"

git -c safe.directory=(Get-Location).Path remote remove origin 2>$null
git -c safe.directory=(Get-Location).Path remote -v

$Remote = "https://github.com/$Owner/$RepoName.git"
git -c safe.directory=(Get-Location).Path remote set-url origin $Remote 2>$null
if (-not (git -c safe.directory=(Get-Location).Path remote get-url origin 2>$null)) {
  git -c safe.directory=(Get-Location).Path remote add origin $Remote
}
git -c safe.directory=(Get-Location).Path push -u origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$Url = "https://$Owner.github.io/$RepoName/"
Write-Host "Ensure repo Settings -> Pages -> Source: GitHub Actions (workflow deploy-pages.yml)."
Write-Host ""
Write-Host "Site (may take 1-2 min): $Url"
Write-Host "Harmony: ${Url}harmony-home.html"
