# Script para aplicar migracion de configuracion de salas y pozos

Write-Host '================================================' -ForegroundColor Cyan
Write-Host '  MIGRACION: Configuracion de Salas y Pozos' -ForegroundColor Cyan
Write-Host '================================================' -ForegroundColor Cyan

$ErrorActionPreference = 'Stop'
$mysqlPath = 'C:\xampp\mysql\bin\mysql.exe'
$dbName = 'bingo_24k'
$user = 'root'
$password = 'bingo2024'
$migrationFile = 'server\ROOM_SETTINGS_MIGRATION.sql'

if (-not (Test-Path $migrationFile)) {
    Write-Host 'Error: No se encontro el archivo' -ForegroundColor Red
    exit 1
}

Write-Host 'Aplicando migracion...' -ForegroundColor Yellow

try {
    Get-Content $migrationFile | & $mysqlPath -u $user -p$password $dbName 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'MIGRACION APLICADA EXITOSAMENTE' -ForegroundColor Green
        & $mysqlPath -u $user -p$password $dbName -e 'SELECT COUNT(*) as Salas FROM room_settings;' -t
    } else {
        throw 'Error al ejecutar migracion'
    }
} catch {
    Write-Host 'ERROR AL APLICAR MIGRACION' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
