# Aplicar migración de configuración Starter
Write-Host "Aplicando migración de configuración Starter..." -ForegroundColor Cyan

$env:MYSQL_PWD = "root"
$result = Get-Content "server\STARTER_CONFIG_MIGRATION.sql" | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root bingo_24k 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migración aplicada exitosamente" -ForegroundColor Green
    Write-Host $result
} else {
    Write-Host "Error al aplicar migración:" -ForegroundColor Red
    Write-Host $result
}
