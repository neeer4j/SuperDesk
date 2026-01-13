@echo off
echo ========================================
echo  SuperDesk Complete Test Suite
echo ========================================
echo.

set TESTS_PASSED=0
set TESTS_FAILED=0

echo [1/2] Running latency verification tests...
echo ----------------------------------------
node test-realtime-latency.js
if %ERRORLEVEL% EQU 0 (
    set /a TESTS_PASSED+=1
    echo [PASS] Latency tests completed successfully
) else (
    set /a TESTS_FAILED+=1
    echo [FAIL] Latency tests failed
)
echo.

echo [2/2] Running user prompts verification tests...
echo ----------------------------------------
node test-user-prompts.js
if %ERRORLEVEL% EQU 0 (
    set /a TESTS_PASSED+=1
    echo [PASS] User prompts tests completed successfully
) else (
    set /a TESTS_FAILED+=1
    echo [FAIL] User prompts tests failed
)
echo.

echo ========================================
echo  Test Summary
echo ========================================
echo Tests Passed: %TESTS_PASSED%/2
echo Tests Failed: %TESTS_FAILED%/2
echo.

if %TESTS_FAILED% EQU 0 (
    echo ✅ ALL TESTS PASSED!
    echo.
    echo Next steps:
    echo 1. Test live session with guest
    echo 2. Verify screen selection dialog appears
    echo 3. Check mouse/scroll responsiveness
    echo 4. Confirm all prompts show correctly
    echo.
    pause
    exit /b 0
) else (
    echo ❌ SOME TESTS FAILED!
    echo Please review the failures above.
    echo.
    pause
    exit /b 1
)
