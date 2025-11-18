@echo off
echo Starting SuperDesk Web App...
echo.
echo Building the app (this may take a minute)...
call npm run build
echo.
echo Starting web server on http://localhost:3000...
echo.
echo Press Ctrl+C to stop the server
serve -s build -l 3000
