# Script de corrección para Trigger de Bolas (90 bolas)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX: TRIGGER BALL RANGE (90)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$sqlFile = "server\FIX_BALL_TRIGGER_90.sql"
$password = "bingo2024"

Write-Host "Ejecutando corrección..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar migración
$env:MYSQL_PWD = $password
& $mysqlPath -u root bingo_24k -e "source $sqlFile" 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ">>> CORRECCION EXITOSA <<<" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Trigger validate_ball_number actualizado a reglas de 90 bolas." -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR EN LA CORRECCION" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica conexiones." -ForegroundColor Yellow
}

Remove-Item Env:\MYSQL_PWD
