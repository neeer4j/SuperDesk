@echo off
echo Building SuperDesk Agent Installer...
echo This will take 1-2 minutes, please wait...
echo.
cd /d "%~dp0"
call npm run dist
echo.
if %ERRORLEVEL% EQU 0 (
    echo Build completed successfully!
    echo Installer location: dist\SuperDesk Agent Setup 1.0.0.exe
) else (
    echo Build failed with error code %ERRORLEVEL%
)
pause
