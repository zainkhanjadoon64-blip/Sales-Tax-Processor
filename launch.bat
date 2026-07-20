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
REM Step 1: Check Python virtual environment (prefer backend\venv)
REM ============================================
set "VENV_DIR=%BACKEND_DIR%\venv"
if not exist "%VENV_DIR%\Scripts\python.exe" (
    set "VENV_DIR=%ROOT_DIR%\venv"
    if not exist "%VENV_DIR%\Scripts\python.exe" (
        echo [ERROR] Python virtual environment not found.
        echo.
        echo Run one of the following to set it up:
        echo   cd /d "%BACKEND_DIR%" ^&^& python -m venv venv
        echo.
        pause
        exit /b 1
    )
)
echo [OK] Python virtual environment found at %VENV_DIR%.
echo.

set "PYTHON_CMD=%VENV_DIR%\Scripts\python.exe"

REM ============================================
REM Step 2: Install/check Python dependencies
REM ============================================
echo Installing/checking backend Python dependencies...
cd /d "%BACKEND_DIR%"
"%PYTHON_CMD%" -m pip install -r requirements.txt > nul 2>&1
if %errorlevel% neq 0 (
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
REM Step 3: Check Node.js dependencies
REM ============================================
cd /d "%ROOT_DIR%"
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
REM Step 4: Apply database migrations (optional)
REM ============================================
cd /d "%ROOT_DIR%"
echo [SKIP] Database migrations are applied automatically at app startup.
echo.

REM ============================================
REM Step 5: Start the backend server
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
REM Step 6: Start the frontend dev server
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
REM Step 7: Open the application in browser
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
echo Close this window to stop the servers (close each server window individually).
echo.

cd /d "%ROOT_DIR%"
pause