@echo off
REM Script para resetear MySQL y crear usuario nuevo
REM Ejecutar como Administrador

echo ========================================
echo RESETEO COMPLETO DE MYSQL
echo ========================================
echo.

echo [1/6] Deteniendo MySQL...
net stop MySQL80
timeout /t 2 >nul

echo [2/6] Borrando archivo de configuracion de contraseña...
del /F /Q "C:\ProgramData\MySQL\MySQL Server 8.0\Data\auto.cnf" 2>nul
del /F /Q "C:\ProgramData\MySQL\MySQL Server 8.0\.mylogin.cnf" 2>nul

echo [3/6] Modificando my.ini para arranque sin contraseña...
echo skip-grant-tables >> "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"

echo [4/6] Iniciando MySQL sin contraseña...
net start MySQL80
timeout /t 5 >nul

echo [5/6] Creando usuario nuevo y cambiando contraseña de root...
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"

echo FLUSH PRIVILEGES; > C:\temp_reset.sql
echo ALTER USER 'root'@'localhost' IDENTIFIED BY 'bingo2024'; >> C:\temp_reset.sql
echo CREATE USER IF NOT EXISTS 'bingo_user'@'localhost' IDENTIFIED BY 'bingo2024'; >> C:\temp_reset.sql
echo GRANT ALL PRIVILEGES ON *.* TO 'bingo_user'@'localhost' WITH GRANT OPTION; >> C:\temp_reset.sql
echo CREATE DATABASE IF NOT EXISTS bingo_24k; >> C:\temp_reset.sql
echo FLUSH PRIVILEGES; >> C:\temp_reset.sql

mysql.exe -u root < C:\temp_reset.sql
del C:\temp_reset.sql

echo [6/6] Quitando skip-grant-tables y reiniciando...
net stop MySQL80
timeout /t 2 >nul

REM Quitar skip-grant-tables del my.ini
powershell -Command "(Get-Content 'C:\ProgramData\MySQL\MySQL Server 8.0\my.ini') | Where-Object {$_ -notmatch 'skip-grant-tables'} | Set-Content 'C:\ProgramData\MySQL\MySQL Server 8.0\my.ini'"

net start MySQL80
timeout /t 3 >nul

echo.
echo ========================================
echo RESETEO COMPLETADO
echo ========================================
echo.
echo Usuario root: password = bingo2024
echo Usuario nuevo: bingo_user / bingo2024
echo Base de datos: bingo_24k creada
echo.
echo Prueba conectarte con estos datos en Workbench
echo.
pause
