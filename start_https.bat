@echo off
setlocal
cd /d %~dp0

echo =========================================
echo  Kourosh Local PWA - Start (HTTPS)
echo =========================================
echo.

echo Starting app... (leave this window open)
echo After it starts, open this on your phone:
echo   https://YOUR-PC-IP:5173/#/
echo Example:
echo   https://192.168.1.10:5173/#/
echo.

echo If your phone shows a warning page, tap:
echo   Advanced -> Proceed
echo then Install/Add to Home Screen.
echo.

echo (Backend runs on http://127.0.0.1:3001 behind proxy)
echo.

echo set TG_PROXY=socks5h://127.0.0.1:10808
echo.

call npm run dev -- --host
pause
