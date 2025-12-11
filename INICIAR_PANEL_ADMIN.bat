@echo off
title Bingo 24K - Panel Admin
color 0B

echo ========================================
echo    BINGO 24K - PANEL DE ADMIN
echo ========================================
echo.

cd /d "%~dp0client-admin"

echo [INFO] Iniciando panel de administracion en puerto 5174...
echo [INFO] Presiona Ctrl+C para detener
echo.

npm run dev

pause
