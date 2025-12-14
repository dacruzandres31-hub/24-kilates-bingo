# Script para verificar y aplicar migración de gift_cards
# Fecha: 13-DIC-2025

Write-Host "🔍 Verificando estructura de tablas gift_cards..." -ForegroundColor Cyan

# Verificar si existen las columnas gift_cards
$checkQuery = @"
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'bingo_24k' 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME LIKE 'gift_cards%';
"@

Write-Host "`n📋 Columnas gift_cards existentes:" -ForegroundColor Yellow
mysql -u root -p bingo_24k -e "$checkQuery"

# Verificar tabla gift_cards_movements
$checkTable = @"
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'bingo_24k' 
AND TABLE_NAME = 'gift_cards_movements';
"@

Write-Host "`n📋 Tabla gift_cards_movements:" -ForegroundColor Yellow
mysql -u root -p bingo_24k -e "$checkTable"

Write-Host "`n✅ Verificación completada" -ForegroundColor Green
Write-Host "Si no aparecen resultados, ejecuta: .\aplicar_gift_cards_migration.ps1" -ForegroundColor Yellow
