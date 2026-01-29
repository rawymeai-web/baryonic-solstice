# Temporarily add Git to PATH for this script session
$env:Path = $env:Path + ";C:\Program Files\Git\cmd"

Write-Host "Initializing Git Repository..."
git init
git add .
git commit -m "Initial commit for Baryonic Solstice"
git branch -M main
Write-Host "--------------------------------------------------------"
Write-Host "Repository initialized locally."
Write-Host "NEXT STEPS:"
Write-Host "1. Create a new repository on GitHub: https://github.com/new"
Write-Host "2. Run this command to connect:"
Write-Host "   git remote add origin <YOUR_REPO_URL>"
Write-Host "3. Run this command to push:"
Write-Host "   git push -u origin main"
Write-Host "--------------------------------------------------------"
