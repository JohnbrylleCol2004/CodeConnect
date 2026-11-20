@echo off
echo ========================================================
echo        Starting FreshFlow POS System
echo ========================================================
echo.
echo 1. Starting Backend API on http://localhost:5000 ...
start "FreshFlow Backend (Port 5000)" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 2 /nobreak >nul

echo 2. Starting Frontend UI on http://localhost:5173 ...
start "FreshFlow Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo Both services are starting in separate windows!
echo - Manager: admin / manager123
echo - Cashier: cashier1 / cashier123
echo ========================================================
echo.
pause
