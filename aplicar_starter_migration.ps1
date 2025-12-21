# Aplicar migración de configuración Starter
Write-Host "Aplicando migración de configuración Starter..." -ForegroundColor Cyan

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$dbName = "bingo_24k"
$user = "root"
$password = "bingo2024"

Write-Host ""
Write-Host "Ejecutando migración..." -ForegroundColor Yellow

$env:MYSQL_PWD = $password
$result = Get-Content "server\STARTER_CONFIG_MIGRATION.sql" | & $mysqlPath -u $user $dbName 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Migracion aplicada exitosamente" -ForegroundColor Green
    Write-Host $result
} else {
    Write-Host ""
    Write-Host "Error al aplicar migracion:" -ForegroundColor Red
    Write-Host $result
}

$env:MYSQL_PWD = $null
