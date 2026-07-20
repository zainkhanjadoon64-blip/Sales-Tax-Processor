@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  Tax Compliance Management System Launcher
echo ============================================
echo.

REM Get the directory where this script is located
set "ROOT_DIR=%~dp0"
set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"

echo Root directory: %ROOT_DIR%
echo.

REM ============================================
REM Step 1: Install/check Python dependencies (using global Python)
REM ============================================
set "PYTHON_CMD=python"
echo Installing/checking backend Python dependencies...
cd /d "%BACKEND_DIR%"
"%PYTHON_CMD%" -m pip install -r requirements.txt > nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    echo Retrying without silent mode...
    "%PYTHON_CMD%" -m pip install -r requirements.txt
    if !errorlevel! neq 0 (
        pause
        exit /b 1
    )
)
echo [OK] Backend dependencies installed.
echo.

REM ============================================
REM Step 2: Check Node.js dependencies
REM ============================================
if not exist "%FRONTEND_DIR%\node_modules" (
    echo Installing frontend Node.js dependencies...
    cd /d "%FRONTEND_DIR%"
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
    echo [OK] Frontend dependencies installed.
) else (
    echo [OK] Frontend dependencies already installed.
)
echo.

REM ============================================
REM Step 3: Apply database migrations (optional - skip if DB is not available)
REM ============================================
cd /d "%ROOT_DIR%"
echo [SKIP] Database migrations are applied automatically at app startup.
echo.

REM ============================================
REM Step 4: Start the backend server
REM ============================================
echo Starting backend server on port 8000...
cd /d "%BACKEND_DIR%"
start "Backend" cmd /c "title Backend Server && ""%PYTHON_CMD%"" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start backend server.
    pause
    exit /b 1
)
echo [OK] Backend server starting...

REM Wait for backend to initialize (5 seconds)
timeout /t 5 /nobreak > nul
echo.

REM ============================================
REM Step 5: Start the frontend dev server
REM ============================================
echo Starting frontend dev server on port 5173...
cd /d "%FRONTEND_DIR%"
start "Frontend" cmd /c "title Frontend Server && npm run dev"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start frontend server.
    pause
    exit /b 1
)
echo [OK] Frontend dev server starting...
echo.

REM ============================================
REM Step 6: Open the application in browser
REM ============================================
echo Opening application in browser...
timeout /t 3 /nobreak > nul
start "" http://localhost:5173

REM ============================================
REM Step 7: Start Cloudflare Tunnel (optional)
REM ============================================
set "CLOUDFLARED=%ROOT_DIR%\cloudflared.exe"
if exist "%CLOUDFLARED%" (
    echo Starting Cloudflare Tunnel for public access...
    cd /d "%ROOT_DIR%"
    start "Cloudflare Tunnel" cmd /c "title Cloudflare Tunnel && ""%CLOUDFLARED%"" tunnel --url http://localhost:5173 --no-autoupdate"
    echo [OK] Cloudflare tunnel starting...
    echo.
    timeout /t 5 /nobreak > nul
) else (
    echo [SKIP] cloudflared.exe not found. Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
)
echo.

echo ============================================
echo  All services are starting up!
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo  API docs: http://localhost:8000/docs
echo  Public:   Check Cloudflare Tunnel window for URL
echo ============================================
echo.
echo Close this window to stop the servers (close each server window separately).
echo.

cd /d "%ROOT_DIR%"
pause