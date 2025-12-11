@echo off
title Bingo 24K - Servidor Backend
color 0A

echo ========================================
echo    BINGO 24K - SERVIDOR BACKEND
echo ========================================
echo.

cd /d "%~dp0server"

echo [INFO] Iniciando servidor en puerto 3001...
echo [INFO] Presiona Ctrl+C para detener
echo.

node src/index.js

pause
