# LifeOS - Unified PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "             LifeOS - Plan less. Do more.               " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting LifeOS services..." -ForegroundColor Green
Write-Host " 1. Auth Service  -> http://localhost:4000" -ForegroundColor White
Write-Host " 2. API Service   -> http://localhost:8000" -ForegroundColor White
Write-Host " 3. Frontend UI   -> http://localhost:3000" -ForegroundColor White
Write-Host ""

$baseDir = $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\backend\auth-service'; npm run dev"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\backend\api-service'; .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\frontend'; npm run dev"

Write-Host "All 3 services launched in separate windows!" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API Docs:  http://localhost:8000/docs" -ForegroundColor Cyan
