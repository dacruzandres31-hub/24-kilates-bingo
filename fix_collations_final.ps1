$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX DEFINITIVO DE COLLATIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$password = "bingo2024"
$sqlFile = "FIX_ALL_COLLATIONS_FINAL.sql"

Write-Host "Convirtiendo TODAS las tablas a utf8mb4_unicode_ci..." -ForegroundColor Yellow
Write-Host "Esto puede tomar varios minutos..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar SQL
$env:MYSQL_PWD = $password
Get-Content $sqlFile | & $mysqlPath -u root bingo_24k 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ">>> CONVERSION COMPLETA <<<" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Todas las tablas convertidas a utf8mb4_unicode_ci" -ForegroundColor Gray
    Write-Host "El error de collations está DEFINITIVAMENTE resuelto" -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host "ERROR EN LA CONVERSION" -ForegroundColor Red
}

Remove-Item Env:\MYSQL_PWD
