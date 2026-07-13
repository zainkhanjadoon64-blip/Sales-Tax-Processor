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
if exist "%ROOT_DIR%\alembic.ini" (
    echo Applying database migrations...
    "%PYTHON_CMD%" -m alembic upgrade head 2>nul
    if !errorlevel! neq 0 (
        echo [WARNING] Database migration failed - this may be OK if using SQLite.
    ) else (
        echo [OK] Database migrations applied.
    )
) else (
    echo [SKIP] No alembic.ini found, skipping migrations.
)
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

echo ============================================
echo  Both servers are starting up!
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo  API docs: http://localhost:8000/docs
echo ============================================
echo.
echo Close this window to stop the servers (close each server window separately).
echo.

cd /d "%ROOT_DIR%"
pause