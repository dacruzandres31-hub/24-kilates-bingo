# Script PowerShell para resetear MySQL (más robusto)
# Ejecutar como Administrador

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESET MYSQL - METODO DIRECTO" -ForegroundColor Cyan  
Write-Host "========================================`n" -ForegroundColor Cyan

# Paso 1: Detener MySQL
Write-Host "[1/5] Deteniendo MySQL..." -ForegroundColor Yellow
Stop-Service MySQL80 -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "  OK`n" -ForegroundColor Green

# Paso 2: Crear archivo SQL de reseteo
Write-Host "[2/5] Creando script de reseteo..." -ForegroundColor Yellow
$resetSQL = @"
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'bingo2024';
CREATE USER IF NOT EXISTS 'bingo_user'@'localhost' IDENTIFIED BY 'bingo2024';
GRANT ALL PRIVILEGES ON *.* TO 'bingo_user'@'localhost' WITH GRANT OPTION;
CREATE DATABASE IF NOT EXISTS bingo_24k;
FLUSH PRIVILEGES;
"@
$resetSQL | Out-File -FilePath "C:\ProgramData\MySQL\reset.sql" -Encoding ASCII -Force
Write-Host "  OK`n" -ForegroundColor Green

# Paso 3: Modificar my.ini
Write-Host "[3/5] Agregando skip-grant-tables a my.ini..." -ForegroundColor Yellow
$iniPath = "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"
$content = Get-Content $iniPath -Raw
if ($content -notmatch "skip-grant-tables") {
    $content = $content -replace "(\[mysqld\])", "`$1`nskip-grant-tables"
    $content | Out-File -FilePath $iniPath -Encoding ASCII -Force
}
Write-Host "  OK`n" -ForegroundColor Green

# Paso 4: Iniciar y ejecutar reset
Write-Host "[4/5] Iniciando MySQL y ejecutando reset..." -ForegroundColor Yellow
Start-Service MySQL80
Start-Sleep -Seconds 5

Get-Content "C:\ProgramData\MySQL\reset.sql" | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root
Start-Sleep -Seconds 2
Write-Host "  OK`n" -ForegroundColor Green

# Paso 5: Limpiar y reiniciar
Write-Host "[5/5] Quitando skip-grant-tables y reiniciando..." -ForegroundColor Yellow
Stop-Service MySQL80 -Force
Start-Sleep -Seconds 2

$content = Get-Content $iniPath -Raw
$content = $content -replace "skip-grant-tables`r?`n", ""
$content | Out-File -FilePath $iniPath -Encoding ASCII -Force

Remove-Item "C:\ProgramData\MySQL\reset.sql" -Force -ErrorAction SilentlyContinue

Start-Service MySQL80
Start-Sleep -Seconds 3
Write-Host "  OK`n" -ForegroundColor Green

# Verificar
Write-Host "========================================" -ForegroundColor Green
Write-Host "VERIFICANDO CONEXION" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

$testResult = & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pbingo2024 -e "SELECT 'OK' as status;" 2>&1

if ($testResult -match "OK") {
    Write-Host "OK Conexion exitosa con root/bingo2024" -ForegroundColor Green
} else {
    Write-Host "ERROR No se pudo verificar la conexion" -ForegroundColor Red
    Write-Host $testResult -ForegroundColor Yellow
}

Write-Host "`nCredenciales:" -ForegroundColor Cyan
Write-Host "  Usuario: root" -ForegroundColor White
Write-Host "  Password: bingo2024" -ForegroundColor White
Write-Host "  Usuario alternativo: bingo_user" -ForegroundColor White
Write-Host "  Password alternativo: bingo2024`n" -ForegroundColor White

Write-Host "Presiona Enter para cerrar..." -ForegroundColor Yellow
Read-Host
