@echo off
REM Heal Hub - Start all services (Windows)
REM Double-click this file or run from the project root

echo ============================================
echo   Heal Hub - Starting All Services
echo ============================================
echo.

echo [1/3] Starting ngrok tunnel...
start "Heal Hub - ngrok" cmd /k "cd backend && python start_ngrok.py"
timeout /t 3 /nobreak > nul

echo [2/3] Starting backend server...
start "Heal Hub - Backend" cmd /k "cd backend && uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --reload"
timeout /t 2 /nobreak > nul

echo [3/3] Starting frontend dev server...
start "Heal Hub - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo   All services started in separate windows!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   Close each window to stop that service
echo ============================================
echo.
pause
