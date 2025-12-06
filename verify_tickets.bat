@echo off
REM ========================================
REM SCRIPT DE VERIFICACION - Tickets v1.3.0
REM ========================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   VERIFICACION DE IMPLEMENTACION - TICKETS v1.3.0         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Variables
set BACKEND_PATH=server\src
set FRONTEND_PATH=client-player\src
set SQL_PATH=server
set ERROR_COUNT=0
set SUCCESS_COUNT=0

echo [1/10] Verificando archivos backend...
echo.

REM Backend Files
if exist "%BACKEND_PATH%\controllers\shopController.js" (
    echo ✅ shopController.js encontrado
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ shopController.js NO encontrado
    set /a ERROR_COUNT+=1
)

if exist "%BACKEND_PATH%\routes\shopRoutes.js" (
    echo ✅ shopRoutes.js encontrado
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ shopRoutes.js NO encontrado
    set /a ERROR_COUNT+=1
)

echo.
echo [2/10] Verificando modificaciones en gameController...
findstr /C:"end_free_game" "%BACKEND_PATH%\controllers\gameController.js" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ end_free_game encontrado en gameController.js
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ end_free_game NO encontrado en gameController.js
    set /a ERROR_COUNT+=1
)

echo.
echo [3/10] Verificando modificaciones en gameRoutes...
findstr /C:"end-free-game" "%BACKEND_PATH%\routes\gameRoutes.js" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Ruta end-free-game encontrada en gameRoutes.js
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ Ruta end-free-game NO encontrada
    set /a ERROR_COUNT+=1
)

echo.
echo [4/10] Verificando registro en index.js...
findstr /C:"shopRoutes" "%BACKEND_PATH%\index.js" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ shopRoutes registrado en index.js
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ shopRoutes NO registrado en index.js
    set /a ERROR_COUNT+=1
)

echo.
echo [5/10] Verificando archivo SQL de migración...
if exist "%SQL_PATH%\TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql" (
    echo ✅ Migration SQL encontrado
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ Migration SQL NO encontrado
    set /a ERROR_COUNT+=1
)

echo.
echo [6/10] Verificando archivos frontend...
if exist "%FRONTEND_PATH%\pages\ShopScreen.jsx" (
    echo ✅ ShopScreen.jsx encontrado
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ ShopScreen.jsx NO encontrado
    set /a ERROR_COUNT+=1
)

if exist "%FRONTEND_PATH%\styles\ShopScreen.css" (
    echo ✅ ShopScreen.css encontrado
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ ShopScreen.css NO encontrado
    set /a ERROR_COUNT+=1
)

echo.
echo [7/10] Verificando documentación...
if exist "TICKETS_PREMIOS_HIBRIDOS.md" (
    echo ✅ Documentación técnica encontrada
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ Documentación técnica NO encontrada
    set /a ERROR_COUNT+=1
)

if exist "TICKETS_INTEGRACION_GUIA.md" (
    echo ✅ Guía de integración encontrada
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ Guía de integración NO encontrada
    set /a ERROR_COUNT+=1
)

echo.
echo [8/10] Verificando sintaxis JavaScript...
where node >nul 2>&1
if %errorlevel% equ 0 (
    node -c "%BACKEND_PATH%\controllers\shopController.js" 2>nul
    if %errorlevel% equ 0 (
        echo ✅ shopController.js - Sintaxis OK
        set /a SUCCESS_COUNT+=1
    ) else (
        echo ❌ shopController.js - Error de sintaxis
        set /a ERROR_COUNT+=1
    )
    
    node -c "%BACKEND_PATH%\routes\shopRoutes.js" 2>nul
    if %errorlevel% equ 0 (
        echo ✅ shopRoutes.js - Sintaxis OK
        set /a SUCCESS_COUNT+=1
    ) else (
        echo ❌ shopRoutes.js - Error de sintaxis
        set /a ERROR_COUNT+=1
    )
) else (
    echo ⚠️  Node.js no encontrado - Saltando verificación de sintaxis
)

echo.
echo [9/10] Verificando estructura SQL...
findstr /C:"ALTER TABLE cosmetic_items" "%SQL_PATH%\TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ALTER TABLE cosmetic_items encontrado
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ ALTER TABLE cosmetic_items NO encontrado
    set /a ERROR_COUNT+=1
)

findstr /C:"ALTER TABLE user_inventory" "%SQL_PATH%\TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ALTER TABLE user_inventory encontrado
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ ALTER TABLE user_inventory NO encontrado
    set /a ERROR_COUNT+=1
)

echo.
echo [10/10] Verificando exports de funciones...
findstr /C:"module.exports" "%BACKEND_PATH%\controllers\shopController.js" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Exports encontrados en shopController.js
    set /a SUCCESS_COUNT+=1
) else (
    echo ❌ Exports NO encontrados en shopController.js
    set /a ERROR_COUNT+=1
)

echo.
echo ════════════════════════════════════════════════════════════
echo.
echo RESUMEN DE VERIFICACIÓN:
echo   ✅ Exitosos: %SUCCESS_COUNT%
echo   ❌ Errores:  %ERROR_COUNT%
echo.

if %ERROR_COUNT% equ 0 (
    echo 🟢 ESTADO: LISTO PARA PRODUCCION
    echo.
    echo Próximos pasos:
    echo   1. Ejecutar migration SQL
    echo   2. Registrar ruta en App.jsx
    echo   3. Testing manual
) else (
    echo 🟡 ESTADO: REQUIERE ATENCION
    echo.
    echo Revisa los errores marcados arriba
)

echo.
echo ════════════════════════════════════════════════════════════
echo.

pause
