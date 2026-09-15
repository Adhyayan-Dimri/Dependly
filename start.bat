@echo off
title Dependly - Supply Chain Risk Intelligence
cls

echo ===================================================
echo   Dependly - Starting Backend ^& Frontend Servers
echo ===================================================
echo.

set ROOT_DIR=%~dp0

:: 1. Check Python virtual environment in backend
if not exist "%ROOT_DIR%backend\venv\Scripts\activate.bat" (
    echo [!] Python virtual environment not found in backend\venv.
    echo [*] Creating virtual environment and installing dependencies...
    python -m venv "%ROOT_DIR%backend\venv"
    call "%ROOT_DIR%backend\venv\Scripts\activate.bat"
    pip install -r "%ROOT_DIR%backend\requirements.txt"
)

:: 2. Check Node modules in frontend
if not exist "%ROOT_DIR%frontend\node_modules" (
    echo [!] Node modules not found in frontend\node_modules.
    echo [*] Installing frontend npm dependencies...
    cd /d "%ROOT_DIR%frontend"
    npm install
    cd /d "%ROOT_DIR%"
)

:: 3. Launch Backend Server in separate terminal window
echo [*] Launching FastAPI Backend Server (http://localhost:8000)...
start "Dependly - FastAPI Backend" cmd /k "cd /d "%ROOT_DIR%backend" && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --port 8000 --reload"

:: 4. Launch Frontend Dev Server in separate terminal window
echo [*] Launching Vite Frontend Server (http://localhost:5173)...
start "Dependly - Vite Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo.
echo ===================================================
echo   [SUCCESS] Both servers are starting up!
echo   - Backend API: http://localhost:8000
echo   - Frontend UI:  http://localhost:5173
echo ===================================================
echo.

:: 5. Open browser automatically after 3 seconds
timeout /t 3 /nobreak >nul
start http://localhost:5173

pause
