# Script de migración para Card Pool System
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MIGRACION: CARD POOL SYSTEM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$sqlFile = "server\CARD_POOL_MIGRATION.sql"
$password = "bingo2024"

Write-Host "Ejecutando migración..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar migración
$env:MYSQL_PWD = $password
& $mysqlPath -u root bingo_24k -e "source $sqlFile" 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ">>> MIGRACION EXITOSA <<<" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tablas creadas:" -ForegroundColor White
    Write-Host "  - card_pool" -ForegroundColor Gray
    Write-Host "  - player_card_selections" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Indices y triggers configurados." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR EN LA MIGRACION" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica:" -ForegroundColor Yellow
    Write-Host "  1. MySQL esta corriendo" -ForegroundColor Gray
    Write-Host "  2. Base de datos bingo_24k existe" -ForegroundColor Gray
    Write-Host ""
}

Remove-Item Env:\MYSQL_PWD
