@echo off
setlocal
cd /d "%~dp0"
echo.
echo Wild Ones LLC local preview
echo ----------------------------
echo Opening http://localhost:8080
echo Press Ctrl+C in this window to stop the preview server.
echo.
start "" "http://localhost:8080"
py -m http.server 8080 --directory dist
if errorlevel 1 python -m http.server 8080 --directory dist
