# Publish this folder to GitHub Pages (run after: gh auth login)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/publish-github-pages.ps1

$ErrorActionPreference = "Stop"
$RepoName = "liquid-glass-demos"

if (-not (gh auth status 2>$null)) {
  Write-Host "First run: gh auth login -h github.com -p https -w"
  exit 1
}

$User = gh api user -q .login
Write-Host "GitHub user: $User"

git -c safe.directory=(Get-Location).Path remote remove origin 2>$null
git -c safe.directory=(Get-Location).Path remote -v

gh repo create $RepoName --public --description "Liquid Glass & Harmony static web demos" --source=. --remote=origin --push
if ($LASTEXITCODE -ne 0) {
  Write-Host "If the repo already exists, set remote manually:"
  Write-Host "  git remote add origin https://github.com/$User/$RepoName.git"
  Write-Host "  git push -u origin main"
  exit $LASTEXITCODE
}

gh api --method POST "/repos/$User/$RepoName/pages" -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Enable Pages in repo Settings -> Pages -> branch main, folder /"
}

$Url = "https://$User.github.io/$RepoName/"
Write-Host ""
Write-Host "Site (may take 1-2 min): $Url"
Write-Host "Harmony: ${Url}harmony-home.html"
