@echo off
set PORT=%1
if "%PORT%"=="" set PORT=3100
REM Copy public assets to standalone build
xcopy /Y /I /S public .next\standalone\public >nul 2>&1
REM Start the standalone server
cd .next\standalone
node server.js
