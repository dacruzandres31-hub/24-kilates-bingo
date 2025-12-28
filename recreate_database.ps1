$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RECREAR BASE DE DATOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$password = "bingo2024"
$backupFile = Get-ChildItem "bingo_24k_backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $backupFile) {
    Write-Host "ERROR: No se encontró archivo de backup" -ForegroundColor Red
    exit 1
}

Write-Host "Usando backup: $($backupFile.Name)" -ForegroundColor Gray
Write-Host ""

# 1. Eliminar base de datos actual
Write-Host "1. Eliminando base de datos actual..." -ForegroundColor Yellow
$env:MYSQL_PWD = $password
& $mysqlPath -u root -e "DROP DATABASE IF EXISTS bingo_24k;" 2>&1 | Out-Null

# 2. Crear nueva base de datos con collation correcta
Write-Host "2. Creando nueva base de datos con utf8mb4_unicode_ci..." -ForegroundColor Yellow
& $mysqlPath -u root -e "CREATE DATABASE bingo_24k CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1 | Out-Null

# 3. Restaurar desde backup
Write-Host "3. Restaurando datos desde backup..." -ForegroundColor Yellow
Write-Host "   Esto puede tomar varios minutos..." -ForegroundColor Gray
Get-Content $backupFile.FullName | & $mysqlPath -u root bingo_24k 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ">>> BASE DE DATOS RECREADA <<<" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Base de datos recreada con utf8mb4_unicode_ci" -ForegroundColor Gray
    Write-Host "Todos los conflictos de collation resueltos" -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host "ERROR EN LA RESTAURACION" -ForegroundColor Red
    exit 1
}

Remove-Item Env:\MYSQL_PWD
