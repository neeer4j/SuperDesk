@echo off
echo ================================
echo  SuperDesk Latency Test Suite
echo ================================
echo.
echo Running automated code verification...
echo.

node test-realtime-latency.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================
    echo  Code Verification: PASSED
    echo ================================
    echo.
    echo Opening interactive test in browser...
    echo.
    start test-latency.html
    echo.
    echo Instructions:
    echo 1. Move mouse around the test area
    echo 2. Scroll with mouse wheel
    echo 3. Click multiple times
    echo 4. Click "Start Automated Tests" button
    echo 5. Check that all latencies are under 10ms
    echo.
    echo Press any key to exit...
    pause >nul
) else (
    echo.
    echo ================================
    echo  Code Verification: FAILED
    echo ================================
    echo.
    echo Please fix the issues above and run again.
    echo.
    pause
)
