# ========================================
# Script: Aplicar sistema de regla 10% cartones gratis
# Descripción: Aplica migraciones SQL y prueba el sistema
# ========================================

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Sistema de Regla 10% - Cartones Gratis Máximo              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:3000/api"
$DB_USER = "root"
$DB_PASS = "bingo2024"
$DB_NAME = "bingo_24k"

# ========================================
# PASO 1: Aplicar Migración de Stored Procedure
# ========================================
Write-Host "[1/6] Aplicando migración sp_transfer_cards con regla 10%..." -ForegroundColor Yellow

try {
    mysql -u $DB_USER -p$DB_PASS $DB_NAME < "server\SP_TRANSFER_CARDS_10PERCENT_RULE.sql"
    Write-Host "✅ Stored procedure actualizado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error aplicando sp_transfer_cards: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ========================================
# PASO 2: Aplicar Migración de Vistas
# ========================================
Write-Host "`n[2/6] Actualizando vistas con porcentaje de gratis..." -ForegroundColor Yellow

try {
    mysql -u $DB_USER -p$DB_PASS $DB_NAME < "server\UPDATE_INVENTORY_VIEWS_PERCENTAGE.sql"
    Write-Host "✅ Vistas actualizadas con free_percentage" -ForegroundColor Green
} catch {
    Write-Host "❌ Error actualizando vistas: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ========================================
# PASO 3: Verificar Estado de Base de Datos
# ========================================
Write-Host "`n[3/6] Verificando estructura de base de datos..." -ForegroundColor Yellow

$verifyQuery = @"
SELECT 
  'user_card_inventory' AS tabla,
  COUNT(*) AS total_registros,
  SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END) AS total_pagos,
  SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) AS total_gratis,
  ROUND(
    (SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) / 
     NULLIF(SUM(quantity), 0) * 100), 
    2
  ) AS porcentaje_gratis
FROM user_card_inventory
UNION ALL
SELECT 
  CONCAT('Vista: ', TABLE_NAME) AS tabla,
  NULL, NULL, NULL, NULL
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = '$DB_NAME' 
  AND TABLE_NAME IN ('v_superadmin_inventory', 'v_admin_inventory');
"@

try {
    $verifyResult = mysql -u $DB_USER -p$DB_PASS $DB_NAME -e $verifyQuery -s
    Write-Host "✅ Estructura verificada:" -ForegroundColor Green
    Write-Host $verifyResult -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Advertencia al verificar: $($_.Exception.Message)" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# ========================================
# PASO 4: Login como SuperAdmin
# ========================================
Write-Host "`n[4/6] Autenticando como SuperAdmin..." -ForegroundColor Yellow

$loginBody = @{
    username = "andy"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login exitoso - Token obtenido" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ========================================
# PASO 5: Consultar Estadísticas de Cartones
# ========================================
Write-Host "`n[5/6] Consultando estadísticas GET /api/cards/stats..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $statsResponse = Invoke-RestMethod -Uri "$API_URL/cards/stats" -Method GET -Headers $headers
    
    Write-Host "✅ Estadísticas obtenidas:" -ForegroundColor Green
    Write-Host "   Timestamp: $($statsResponse.timestamp)" -ForegroundColor Gray
    
    Write-Host "`n   📊 Estadísticas Globales:" -ForegroundColor Cyan
    Write-Host "      - Total Pagos: $($statsResponse.global.total_paid)" -ForegroundColor White
    Write-Host "      - Total Gratis: $($statsResponse.global.total_free)" -ForegroundColor Yellow
    Write-Host "      - Total Cartones: $($statsResponse.global.total_cards)" -ForegroundColor White
    Write-Host "      - Porcentaje Gratis: $($statsResponse.global.free_percentage)%" -ForegroundColor $(if ($statsResponse.global.free_percentage -le 10) { "Green" } else { "Red" })
    Write-Host "      - Usuarios: $($statsResponse.global.total_users)" -ForegroundColor Gray
    
    Write-Host "`n   🎯 Cumplimiento de Regla:" -ForegroundColor Cyan
    Write-Host "      - Regla: $($statsResponse.compliance.rule)" -ForegroundColor Gray
    Write-Host "      - Estado: $(if ($statsResponse.compliance.compliant) { '✅ CUMPLE' } else { '⚠️ NO CUMPLE' })" -ForegroundColor $(if ($statsResponse.compliance.compliant) { "Green" } else { "Red" })
    
    if ($statsResponse.by_room -and $statsResponse.by_room.Count -gt 0) {
        Write-Host "`n   🏠 Por Sala:" -ForegroundColor Cyan
        foreach ($room in $statsResponse.by_room) {
            Write-Host "      [$($room.room.ToUpper())]" -ForegroundColor Magenta
            Write-Host "        - Pagos: $($room.total_paid) | Gratis: $($room.total_free)" -ForegroundColor Gray
            Write-Host "        - Porcentaje: $($room.free_percentage)% | Usuarios: $($room.total_users)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "❌ Error consultando estadísticas: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ========================================
# PASO 6: Verificar Stored Procedure
# ========================================
Write-Host "`n[6/6] Verificando sp_transfer_cards..." -ForegroundColor Yellow

$spCheckQuery = @"
SELECT 
  ROUTINE_NAME,
  ROUTINE_TYPE,
  CREATED,
  LAST_ALTERED
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = '$DB_NAME'
  AND ROUTINE_NAME = 'sp_transfer_cards';
"@

try {
    $spResult = mysql -u $DB_USER -p$DB_PASS $DB_NAME -e $spCheckQuery -s
    if ($spResult) {
        Write-Host "✅ Stored procedure sp_transfer_cards actualizado:" -ForegroundColor Green
        Write-Host $spResult -ForegroundColor Gray
    } else {
        Write-Host "⚠️ No se encontró sp_transfer_cards" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Advertencia al verificar SP: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ========================================
# RESUMEN FINAL
# ========================================
Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  IMPLEMENTACIÓN COMPLETADA                                   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "✅ Cambios aplicados:" -ForegroundColor Green
Write-Host "   1. sp_transfer_cards actualizado con regla 10%" -ForegroundColor White
Write-Host "   2. Vistas con columna free_percentage" -ForegroundColor White
Write-Host "   3. Endpoint GET /api/cards/stats disponible" -ForegroundColor White
Write-Host "   4. cardsController.selectCards() con validación 10%" -ForegroundColor White

Write-Host "`n📋 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Reiniciar servidor: npm run dev -w server" -ForegroundColor Gray
Write-Host "   2. Probar selección de cartones en salas pagas" -ForegroundColor Gray
Write-Host "   3. Probar transferencias entre usuarios" -ForegroundColor Gray
Write-Host "   4. Monitorear logs de consola para mensajes [Cards]" -ForegroundColor Gray

Write-Host "`n💡 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   - Ver stats: Invoke-RestMethod -Uri '$API_URL/cards/stats' -Headers @{'Authorization'='Bearer YOUR_TOKEN'}" -ForegroundColor Gray
Write-Host "   - Ver inventario: SELECT * FROM v_superadmin_inventory;" -ForegroundColor Gray
Write-Host "   - Ver logs: SELECT * FROM card_movements_log ORDER BY created_at DESC LIMIT 20;" -ForegroundColor Gray

Write-Host ""
