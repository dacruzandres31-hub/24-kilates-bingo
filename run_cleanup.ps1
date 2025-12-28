$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESET: POZOS PRE-40" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$sqlFile = "RESET_PRE40_POTS.sql"
$password = "bingo2024"

Write-Host "Reseteando pozos Pre-40 a cero..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar SQL usando Get-Content
$env:MYSQL_PWD = $password
Get-Content $sqlFile | & $mysqlPath -u root bingo_24k 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ">>> RESET EXITOSO <<<" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pozos Pre-40 reseteados a 0." -ForegroundColor Gray
    Write-Host "Reinicia el servidor para reflejar cambios." -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host "ERROR EN EL RESET" -ForegroundColor Red
}

Remove-Item Env:\MYSQL_PWD
