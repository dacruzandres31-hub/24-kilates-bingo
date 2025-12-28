$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX: TODAS LAS COLLATIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$password = "bingo2024"
$sqlFile = "FIX_ALL_COLLATIONS.sql"

Write-Host "Convirtiendo TODAS las columnas a utf8mb4_unicode_ci..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar SQL
$env:MYSQL_PWD = $password
Get-Content $sqlFile | & $mysqlPath -u root bingo_24k 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ">>> TODAS LAS COLLATIONS ACTUALIZADAS <<<" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ya no deberían haber conflictos de collation" -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host "ERROR ACTUALIZANDO COLLATIONS" -ForegroundColor Red
}

Remove-Item Env:\MYSQL_PWD
