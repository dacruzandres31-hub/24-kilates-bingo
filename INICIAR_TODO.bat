@echo off
title Bingo 24K - INICIO COMPLETO
color 0E

echo ========================================
echo    BINGO 24K - SISTEMA COMPLETO
echo ========================================
echo.
echo [1/2] Iniciando Servidor Backend (puerto 3001)...

start "Bingo 24K - Backend" cmd /k "cd /d "%~dp0server" && node src/index.js"

timeout /t 5 /nobreak >nul

echo [2/2] Iniciando Panel de Administracion (puerto 5174)...

start "Bingo 24K - Admin Panel" cmd /k "cd /d "%~dp0client-admin" && npm run dev"

echo.
echo ========================================
echo    SISTEMA INICIADO CORRECTAMENTE
echo ========================================
echo.
echo - Backend:     http://localhost:3001
echo - Admin Panel: http://localhost:5174
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
echo (Los servidores seguiran corriendo en ventanas separadas)
pause >nul
