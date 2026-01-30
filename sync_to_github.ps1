$ErrorActionPreference = "Stop"

Write-Host "Syncing Baryonic Solstice (Backend) to GitHub..." -ForegroundColor Cyan
cd "c:\Users\s_eme\.gemini\antigravity\playground\baryonic-solstice"

# Check for changes
if ($(git status --porcelain)) {
    git add .
    git commit -m "auto-save: updated code from playground"
    git push origin main
    Write-Host "Backend synced successfully!" -ForegroundColor Green
} else {
    Write-Host "No changes to sync in Backend." -ForegroundColor Yellow
}

Write-Host "Done!" -ForegroundColor Cyan
