@echo off
echo ========================================
echo MIGRACION: CARD POOL SYSTEM
echo ========================================
echo.
echo Asegurate de tener MySQL corriendo...
echo.

set /p MYSQL_PASSWORD="Ingresa tu password de MySQL root: "

"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p%MYSQL_PASSWORD% bingo_24k < server\CARD_POOL_MIGRATION.sql

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ^>^>^> MIGRACION EXITOSA ^<^<^<
    echo ========================================
    echo.
    echo Tablas creadas:
    echo - card_pool
    echo - player_card_selections
    echo.
    echo Indices y triggers configurados correctamente.
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR EN LA MIGRACION
    echo ========================================
    echo.
    echo Verifica:
    echo 1. MySQL esta corriendo
    echo 2. Usuario root tiene permisos
    echo 3. Base de datos bingo_24k existe
    echo.
)

pause
