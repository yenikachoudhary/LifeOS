@echo off
title LifeOS Launcher
echo ========================================================
echo               LifeOS - Plan less. Do more.
echo ========================================================
echo.
echo Launching services:
echo   1. Auth Service  - Port 4000 (Express + MongoDB)
echo   2. API Service   - Port 8000 (FastAPI + MongoDB)
echo   3. Frontend      - Port 3000 (Next.js 14)
echo.

start "LifeOS Auth Service [Port 4000]" cmd /k "cd /d "%~dp0backend\auth-service" && npm run dev"
timeout /t 2 /nobreak >nul

start "LifeOS API Service [Port 8000]" cmd /k "cd /d "%~dp0backend\api-service" && .venv\Scripts\uvicorn.exe app.main:app --reload --port 8000"
timeout /t 2 /nobreak >nul

start "LifeOS Frontend [Port 3000]" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo   All 3 services are starting!
echo   Open your browser at: http://localhost:3000
echo   FastAPI Swagger Docs: http://localhost:8000/docs
echo ========================================================
echo.
pause
