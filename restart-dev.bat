@echo off
REM Restart Development Servers (Windows Batch Script)
REM Alternative to PowerShell script for systems with execution policy restrictions

echo ========================================
echo   Easy English - Dev Server Restart
echo ========================================
echo.

echo [1/5] Stopping previous dev server processes...
REM Kill terminal windows opened by the previous run of this script
taskkill /F /FI "WINDOWTITLE eq Backend Server" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend Server" >nul 2>&1
REM Kill any remaining node processes on the dev ports (3000, 4000)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo Done: Previous dev server processes stopped
echo.

echo [2/5] Cleaning frontend cache...
cd /d "%~dp0frontend"
if exist .next rmdir /s /q .next
if exist .swc rmdir /s /q .swc
echo Done: Frontend cache cleared
echo.

echo [3/5] Cleaning backend cache...
cd /d "%~dp0backend"
if exist dist rmdir /s /q dist
echo Done: Backend cache cleared
echo.

cd /d "%~dp0"

echo [4/5] Starting backend server...
cd /d "%~dp0backend"
start "Backend Server" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
echo Done: Backend server starting...
echo.

echo [5/5] Starting frontend server...
cd /d "%~dp0frontend"
start "Frontend Server" cmd /k "npm run dev"
echo Done: Frontend server starting...
echo.

echo ========================================
echo All servers restarted!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:4000
echo.
pause
