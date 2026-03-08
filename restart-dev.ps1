#!/usr/bin/env pwsh
# Restart Development Servers Script
# Stops all Node processes, clears caches, and restarts frontend and backend servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Easy English - Dev Server Restart" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop previous dev server processes
Write-Host "[1/5] Stopping previous dev server processes..." -ForegroundColor Yellow

# Kill terminal windows opened by the previous run of this script
Get-Process -Name cmd -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -match "Backend Server|Frontend Server" } |
    Stop-Process -Force -ErrorAction SilentlyContinue

Get-Process -Name powershell, pwsh -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -match "Backend Server|Frontend Server|easy_eng" } |
    Stop-Process -Force -ErrorAction SilentlyContinue

# Kill any processes listening on the dev ports (3000, 4000)
foreach ($port in @(3000, 4000)) {
    $pids = (netstat -ano | Select-String ":$port\s.*LISTENING") -replace '.*\s(\d+)$', '$1' | Select-Object -Unique
    foreach ($p in $pids) {
        if ($p -match '^\d+$') {
            Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
        }
    }
}

Start-Sleep -Seconds 1
Write-Host "✓ Previous dev server processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Clean frontend cache
Write-Host "[2/5] Cleaning frontend cache..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\frontend"
if (Test-Path .next) {
    Remove-Item -Path .next -Recurse -Force
    Write-Host "✓ Removed .next folder" -ForegroundColor Green
}
if (Test-Path .swc) {
    Remove-Item -Path .swc -Recurse -Force
    Write-Host "✓ Removed .swc folder" -ForegroundColor Green
}
Write-Host "✓ Frontend cache cleared" -ForegroundColor Green
Write-Host ""

# Step 3: Clean backend cache (if any)
Write-Host "[3/5] Cleaning backend cache..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"
if (Test-Path dist) {
    Remove-Item -Path dist -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Removed dist folder" -ForegroundColor Green
}
Write-Host "✓ Backend cache cleared" -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot

# Step 4: Start backend server
Write-Host "[4/5] Starting backend server..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev" -WindowStyle Normal
Write-Host "✓ Backend server starting on port 4000..." -ForegroundColor Green
Start-Sleep -Seconds 3
Write-Host ""

# Step 5: Start frontend server
Write-Host "[5/5] Starting frontend server..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal
Write-Host "✓ Frontend server starting on port 3000..." -ForegroundColor Green
Write-Host ""

# Done
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ All servers restarted!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend:  http://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
