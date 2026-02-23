@echo off
setlocal
cd /d %~dp0

echo ===============================
echo Kourosh PWA Local Start (HTTPS)
echo ===============================

echo Starting backend + Vite dev server on HTTPS...
echo After it starts, open on your phone:
echo   https://<PC-IP>:5173/#/
echo Example:
echo   https://192.168.1.106:5173/#/
echo.
echo On first open, tap Advanced -> Proceed.
echo Then: Add to Home Screen / Install.
echo.

call npm run start:https
