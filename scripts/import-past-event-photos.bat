@echo off
setlocal
cd /d "%~dp0.."

if "%~1"=="" (
  echo.
  echo Wild Ones Past Event Photo Importer
  echo ===================================
  echo.
  echo Single event:
  echo   scripts\import-past-event-photos.bat "C:\Photos\Huntington Beach" bass-babes-recruitment-2022
  echo.
  echo Batch folders:
  echo   scripts\import-past-event-photos.bat "C:\Photos\Wild Ones Archive"
  echo.
  echo For batch mode, Source must contain folders named:
  echo   bass-babes-recruitment-2022
  echo   groove-cruise-2022
  echo   wild-ones-takes-flight-2022
  echo   nocturne-2026
  echo.
  exit /b 1
)

set "SOURCE=%~1"
set "EVENTKEY=%~2"

if "%EVENTKEY%"=="" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0import-past-event-photos.ps1" -Source "%SOURCE%"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0import-past-event-photos.ps1" -Source "%SOURCE%" -EventKey "%EVENTKEY%"
)

if errorlevel 1 (
  echo.
  echo [FAIL] Photo import failed.
  exit /b 1
)

echo.
echo [OK] Photo import complete.
endlocal
