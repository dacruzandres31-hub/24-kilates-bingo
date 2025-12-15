# Script PowerShell para generar cartones de bingo
# Ejecutar desde la raíz del proyecto

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  GENERADOR DE CARTONES DE BINGO" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Aplicar migración
Write-Host "1️⃣  Aplicando migración de base de datos..." -ForegroundColor Green
mysql -u root -p bingo_24k < server/CARTONES_MIGRATION.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error aplicando migración" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Migración aplicada correctamente`n" -ForegroundColor Green

# 2. Generar cartones
Write-Host "2️⃣  Generando cartones..." -ForegroundColor Green
node server/scripts/generateCards.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error generando cartones" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Proceso completado" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
