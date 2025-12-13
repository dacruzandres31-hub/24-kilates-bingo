#!/usr/bin/env pwsh
# Script para ejecutar migración de cartones de regalo
# Fecha: 13-DIC-2025

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIGRACION: Sistema de Cartones de Regalo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuración de MySQL
$dbHost = "localhost"
$dbPort = "3306"
$dbName = "bingo_24k"
$dbUser = "root"

# Solicitar contraseña
$dbPassword = Read-Host "Ingrese la contraseña de MySQL root" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "🔍 Verificando conexión a MySQL..." -ForegroundColor Yellow

# Probar conexión
$testConnection = "SELECT 1" | mysql -h $dbHost -P $dbPort -u $dbUser -p"$plainPassword" $dbName 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: No se pudo conectar a MySQL" -ForegroundColor Red
    Write-Host $testConnection -ForegroundColor Red
    exit 1
}

Write-Host "✅ Conexión exitosa" -ForegroundColor Green
Write-Host ""

# Ejecutar migración
Write-Host "📦 Ejecutando migración de cartones de regalo..." -ForegroundColor Yellow
$migrationFile = Join-Path $PSScriptRoot "server\GIFT_CARDS_MIGRATION.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: No se encontró el archivo de migración" -ForegroundColor Red
    Write-Host "   Ruta esperada: $migrationFile" -ForegroundColor Red
    exit 1
}

# Ejecutar archivo SQL
Get-Content $migrationFile | mysql -h $dbHost -P $dbPort -u $dbUser -p"$plainPassword" $dbName 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migración ejecutada exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Columnas agregadas:" -ForegroundColor Cyan
    Write-Host "   - gift_cards_bronce (INT)" -ForegroundColor White
    Write-Host "   - gift_cards_plata (INT)" -ForegroundColor White
    Write-Host "   - gift_cards_oro (INT)" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Tabla creada:" -ForegroundColor Cyan
    Write-Host "   - gift_cards_movements (registro de movimientos)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎁 Sistema de cartones de regalo listo para usar" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error ejecutando migración" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
