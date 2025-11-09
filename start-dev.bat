@echo off
echo Starting SuperDesk Development Environment
echo.
echo Starting Server on port 3001...
start "SuperDesk Server" cmd /k "cd /d %~dp0server && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting Client on port 3000...
start "SuperDesk Client" cmd /k "cd /d %~dp0client && set BROWSER=none && npm start"

echo.
echo ========================================
echo SuperDesk is starting!
echo ========================================
echo Server: http://localhost:3001
echo Client: http://localhost:3000
echo ========================================
echo.
echo Press any key to exit this window (servers will keep running)
pause > nul
