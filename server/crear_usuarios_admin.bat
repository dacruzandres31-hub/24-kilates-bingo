@echo off
echo ========================================
echo Creando usuarios SuperAdmin
echo ========================================
echo.
echo Usuarios que se crearan:
echo 1. admin / admin123
echo 2. superadmin / superadmin123
echo.
echo Ingresa la contraseña de MySQL root cuando se solicite...
echo.

"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p bingo_24k < create_superadmin.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Usuarios creados exitosamente!
    echo ========================================
    echo.
    echo Puedes usar cualquiera de estos para login:
    echo - admin / admin123
    echo - superadmin / superadmin123
    echo.
) else (
    echo.
    echo Error al crear usuarios. Verifica:
    echo 1. MySQL esta instalado en C:\Program Files\MySQL\MySQL Server 8.0\
    echo 2. La base de datos 'bingo_24k' existe
    echo 3. La contraseña de root es correcta
    echo.
)

pause
