# Simple script to monitor the backend logs
# Run this in a separate terminal while testing

Write-Host "Monitoring backend server (Process ID: 47948)" -ForegroundColor Green
Write-Host "Waiting for API calls..." -ForegroundColor Yellow
Write-Host ""

# This will show if the process is still running
$process = Get-Process -Id 47948 -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "✓ Backend server is running" -ForegroundColor Green
    Write-Host "  Process: $($process.ProcessName)" -ForegroundColor Cyan
    Write-Host "  Memory: $([math]::Round($process.WorkingSet64/1MB, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "✗ Backend server is not running!" -ForegroundColor Red
}
