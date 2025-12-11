# ========================================
# Test SuperAdmin - Sistema de Stock con Salas de Regalo
# ========================================

$baseUrl = "http://localhost:3001"
$token = ""

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST: SISTEMA DE STOCK CON REGALO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Login como SuperAdmin
Write-Host "[1] Iniciando sesión como SuperAdmin (Andy)..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body (@{
    username = "Andy"
    password = "Tasso2025"
} | ConvertTo-Json)

if ($loginResponse.success) {
    $token = $loginResponse.token
    Write-Host "✅ Login exitoso - Token obtenido" -ForegroundColor Green
} else {
    Write-Host "❌ Error en login" -ForegroundColor Red
    exit 1
}

# 2. Obtener resumen de stock
Write-Host "`n[2] Consultando resumen de stock..." -ForegroundColor Yellow
$stockSummary = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/summary" -Method GET -Headers @{
    "Authorization" = "Bearer $token"
}

Write-Host "📊 Resumen de Stock:" -ForegroundColor Cyan
Write-Host "Salas Normales:" -ForegroundColor White
$stockSummary.summary.normal | ForEach-Object {
    Write-Host "  - $($_.room): Total=$($_.total_cards), Disponibles=$($_.available), Vendidos=$($_.sold)" -ForegroundColor Gray
}

Write-Host "`nSalas de Regalo:" -ForegroundColor Yellow
if ($stockSummary.summary.regalo.Count -eq 0) {
    Write-Host "  (Sin stock de regalo aún)" -ForegroundColor Gray
} else {
    $stockSummary.summary.regalo | ForEach-Object {
        Write-Host "  - $($_.room): Total=$($_.total_cards), Disponibles=$($_.available), Vendidos=$($_.sold)" -ForegroundColor Gray
    }
}

# 3. Generar stock de BRONCE REGALO
Write-Host "`n[3] Generando 10 cartones de BRONCE REGALO..." -ForegroundColor Yellow
try {
    $generateResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/generate" -Method POST -Headers @{
        "Authorization" = "Bearer $token"
    } -ContentType "application/json" -Body (@{
        room = "bronce_regalo"
        quantity = 10
        playDate = (Get-Date).ToString("yyyy-MM-dd")
        playTime = "19:00:00"
    } | ConvertTo-Json)

    Write-Host "✅ $($generateResponse.message)" -ForegroundColor Green
    Write-Host "   Cartones generados: $($generateResponse.cardsGenerated)" -ForegroundColor Gray
    Write-Host "   Es sala de regalo: $($generateResponse.isGiftRoom)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error generando stock: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Generar stock de PLATA REGALO
Write-Host "`n[4] Generando 5 cartones de PLATA REGALO..." -ForegroundColor Yellow
try {
    $generateResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/generate" -Method POST -Headers @{
        "Authorization" = "Bearer $token"
    } -ContentType "application/json" -Body (@{
        room = "plata_regalo"
        quantity = 5
        playDate = (Get-Date).ToString("yyyy-MM-dd")
        playTime = "20:00:00"
    } | ConvertTo-Json)

    Write-Host "✅ $($generateResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Generar stock de ORO REGALO
Write-Host "`n[5] Generando 3 cartones de ORO REGALO..." -ForegroundColor Yellow
try {
    $generateResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/generate" -Method POST -Headers @{
        "Authorization" = "Bearer $token"
    } -ContentType "application/json" -Body (@{
        room = "oro_regalo"
        quantity = 3
        playDate = (Get-Date).ToString("yyyy-MM-dd")
        playTime = "21:00:00"
    } | ConvertTo-Json)

    Write-Host "✅ $($generateResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Ver resumen actualizado
Write-Host "`n[6] Consultando resumen actualizado..." -ForegroundColor Yellow
$stockSummary = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/summary" -Method GET -Headers @{
    "Authorization" = "Bearer $token"
}

Write-Host "`n📊 Resumen Actualizado:" -ForegroundColor Cyan
Write-Host "Salas de Regalo:" -ForegroundColor Yellow
$stockSummary.summary.regalo | ForEach-Object {
    Write-Host "  🎁 $($_.room): Total=$($_.total_cards), Disponibles=$($_.available)" -ForegroundColor Green
}

# 7. Transferir stock de regalo a un usuario
Write-Host "`n[7] Buscando un usuario para transferir stock..." -ForegroundColor Yellow
try {
    # Buscar primer usuario que no sea SuperAdmin
    $users = Invoke-RestMethod -Uri "$baseUrl/api/admin/users/hierarchy" -Method GET -Headers @{
        "Authorization" = "Bearer $token"
    }
    
    $targetUser = $users | Where-Object { $_.role -ne 'superadmin' } | Select-Object -First 1
    
    if ($targetUser) {
        Write-Host "   Usuario seleccionado: $($targetUser.username) (ID: $($targetUser.id))" -ForegroundColor Gray
        
        # Transferir 2 cartones de bronce_regalo
        Write-Host "`n[8] Transfiriendo 2 cartones de BRONCE REGALO..." -ForegroundColor Yellow
        $transferResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/transfer" -Method POST -Headers @{
            "Authorization" = "Bearer $token"
        } -ContentType "application/json" -Body (@{
            targetUserId = $targetUser.id
            room = "bronce_regalo"
            quantity = 2
        } | ConvertTo-Json)
        
        Write-Host "✅ $($transferResponse.message)" -ForegroundColor Green
        
        # Ver stock del usuario
        Write-Host "`n[9] Consultando stock del usuario..." -ForegroundColor Yellow
        $userStock = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/user/$($targetUser.id)" -Method GET -Headers @{
            "Authorization" = "Bearer $token"
        }
        
        Write-Host "📦 Stock de $($userStock.user.username):" -ForegroundColor Cyan
        Write-Host "   Bronce: $($userStock.stock.cards_bronce)" -ForegroundColor Gray
        Write-Host "   Plata: $($userStock.stock.cards_plata)" -ForegroundColor Gray
        Write-Host "   Oro: $($userStock.stock.cards_oro)" -ForegroundColor Gray
        Write-Host "   🎁 Bronce Regalo: $($userStock.stock.cards_bronce_regalo)" -ForegroundColor Yellow
        Write-Host "   🎁 Plata Regalo: $($userStock.stock.cards_plata_regalo)" -ForegroundColor Yellow
        Write-Host "   🎁 Oro Regalo: $($userStock.stock.cards_oro_regalo)" -ForegroundColor Yellow
        
    } else {
        Write-Host "⚠️ No se encontró usuario para transferir" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error en transferencia: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLETADO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
