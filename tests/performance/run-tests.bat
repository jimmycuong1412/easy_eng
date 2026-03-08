@echo off
REM Performance Test Suite Runner - Windows Version
REM Easy English Learning Platform - Phase 17

setlocal enabledelayedexpansion

REM Configuration
if "%API_BASE_URL%"=="" set API_BASE_URL=http://localhost:3001
if "%FRONTEND_URL%"=="" set FRONTEND_URL=http://localhost:3000

REM Colors using PowerShell (Windows 10+)
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

echo.
echo ========================================
echo   Easy English - Performance Test Suite
echo ========================================
echo.

REM Check if k6 is installed
where k6 >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%Error: k6 is not installed%NC%
    echo.
    echo Install k6 with: choco install k6
    echo Or download from: https://k6.io/docs/getting-started/installation
    exit /b 1
)

echo Target API: %API_BASE_URL%
echo Frontend:   %FRONTEND_URL%
echo.

REM Parse arguments
if "%1"=="" (
    call :interactive_mode
) else if "%2"=="" (
    echo Error: Missing argument
    call :show_usage
    exit /b 1
) else (
    call :run_tests %1 %2
)

exit /b 0

:run_tests
set scenario=%1
set test_name=%2

if "%test_name%"=="all" (
    call :run_all_tests %scenario%
) else (
    call :run_single_test %scenario% %test_name%
)
exit /b

:run_single_test
set scenario=%1
set test_name=%2

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Running: %test_name% ^(%scenario%^)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

if "%test_name%"=="booking" (
    set test_file=booking-load.test.js
) else if "%test_name%"=="search" (
    set test_file=class-search.test.js
) else if "%test_name%"=="dashboard" (
    set test_file=dashboard-load.test.js
) else if "%test_name%"=="gems" (
    set test_file=gem-transaction.test.js
) else if "%test_name%"=="concurrent" (
    set test_file=concurrent-users.test.js
) else if "%test_name%"=="conflicts" (
    set test_file=concurrent-bookings.test.js
) else (
    echo Error: Invalid test name '%test_name%'
    echo Valid tests: booking, search, dashboard, gems, concurrent, conflicts
    exit /b 1
)

if "%scenario%"=="default" (
    k6 run !test_file!
) else (
    k6 run -e SCENARIO=%scenario% !test_file!
)

if %ERRORLEVEL% equ 0 (
    echo.
    echo %GREEN%✓ Test passed: %test_name%%NC%
) else (
    echo.
    echo %RED%✗ Test failed: %test_name%%NC%
    exit /b 1
)
exit /b 0

:run_all_tests
set scenario=%1

echo Running full test suite with scenario: %scenario%
echo.

set failed=0

call :run_single_test %scenario% booking
if %ERRORLEVEL% neq 0 set /a failed+=1

call :run_single_test %scenario% search
if %ERRORLEVEL% neq 0 set /a failed+=1

call :run_single_test %scenario% dashboard
if %ERRORLEVEL% neq 0 set /a failed+=1

call :run_single_test %scenario% gems
if %ERRORLEVEL% neq 0 set /a failed+=1

call :run_single_test %scenario% concurrent
if %ERRORLEVEL% neq 0 set /a failed+=1

call :run_single_test %scenario% conflicts
if %ERRORLEVEL% neq 0 set /a failed+=1

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   Test Suite Summary
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Total tests: 6
set /a passed=6-failed
echo Passed:      %passed%

if %failed% gtr 0 (
    echo %RED%Failed:      %failed%%NC%
    exit /b 1
) else (
    echo %GREEN%All tests passed!%NC%
)
exit /b 0

:interactive_mode
echo Select scenario:
echo   1. smoke
echo   2. average_load
echo   3. stress
echo   4. spike
echo   5. soak
echo   6. peak_bookings
echo.
set /p scenario_choice="Enter number (1-6): "

if "%scenario_choice%"=="1" set scenario=smoke
if "%scenario_choice%"=="2" set scenario=average_load
if "%scenario_choice%"=="3" set scenario=stress
if "%scenario_choice%"=="4" set scenario=spike
if "%scenario_choice%"=="5" set scenario=soak
if "%scenario_choice%"=="6" set scenario=peak_bookings

if "%scenario%"=="" (
    echo Invalid selection
    exit /b 1
)

echo.
echo Select test:
echo   1. booking
echo   2. search
echo   3. dashboard
echo   4. gems
echo   5. concurrent
echo   6. conflicts
echo   7. all
echo.
set /p test_choice="Enter number (1-7): "

if "%test_choice%"=="1" set test_name=booking
if "%test_choice%"=="2" set test_name=search
if "%test_choice%"=="3" set test_name=dashboard
if "%test_choice%"=="4" set test_name=gems
if "%test_choice%"=="5" set test_name=concurrent
if "%test_choice%"=="6" set test_name=conflicts
if "%test_choice%"=="7" set test_name=all

if "%test_name%"=="" (
    echo Invalid selection
    exit /b 1
)

echo.
call :run_tests %scenario% %test_name%
exit /b

:show_usage
echo Usage:
echo   %~nx0                    - Interactive mode
echo   %~nx0 [scenario] [test]  - Run specific test
echo.
echo Examples:
echo   %~nx0 smoke all          - Run all tests with smoke scenario
echo   %~nx0 stress booking     - Run booking test with stress scenario
echo.
echo Scenarios: smoke, average_load, stress, spike, soak, peak_bookings
echo Tests:     booking, search, dashboard, gems, concurrent, conflicts, all
exit /b 0
