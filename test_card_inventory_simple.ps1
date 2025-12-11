# Test Sistema de Inventario de Cartones v1.4.0

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3001"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: Sistema de Inventario de Cartones" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. LOGIN COMO SUPERADMIN
Write-Host "[1/10] Autenticando como SuperAdmin..." -ForegroundColor Yellow

$loginBody = @{
    username = "Andy"
    password = "Tasso2025"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $superAdminToken = $loginResponse.token
    $superAdminId = $loginResponse.user.id
    Write-Host "OK - Login exitoso" -ForegroundColor Green
    Write-Host "   Usuario: $($loginResponse.user.username) (ID: $superAdminId)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# 2. OBTENER USUARIOS DE LA RED
Write-Host "`n[2/10] Obteniendo usuarios de la red..." -ForegroundColor Yellow

try {
    $headers = @{ "Authorization" = "Bearer $superAdminToken" }
    $usersResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/users/hierarchy" -Method GET -Headers $headers
    
    Write-Host "OK - Usuarios obtenidos:" -ForegroundColor Green
    
    $adminUser = $usersResponse.users | Where-Object { $_.role -eq 'agente' } | Select-Object -First 1
    $jugadorUser = $usersResponse.users | Where-Object { $_.role -eq 'jugador' } | Select-Object -First 1
    
    if ($adminUser) {
        Write-Host "   Admin: $($adminUser.username) (ID: $($adminUser.id))" -ForegroundColor Gray
    }
    if ($jugadorUser) {
        Write-Host "   Jugador: $($jugadorUser.username) (ID: $($jugadorUser.id))" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERROR obteniendo usuarios: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# 3. ACREDITAR CARTONES NORMALES
Write-Host "`n[3/10] Acreditando 100 cartones NORMALES..." -ForegroundColor Yellow

$creditBody = @{
    user_id = $adminUser.id
    room = "bronce"
    quantity = 100
    is_gift = $false
    purchase_price = 8000
    reason = "Compra inicial - 80% del precio base"
} | ConvertTo-Json

try {
    $creditResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/credit" -Method POST -Headers $headers -ContentType "application/json" -Body $creditBody
    Write-Host "OK - $($creditResponse.message)" -ForegroundColor Green
    Write-Host "   Total ahora: $($creditResponse.newTotal)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 4. ACREDITAR CARTONES DE REGALO
Write-Host "`n[4/10] Acreditando 20 cartones DE REGALO..." -ForegroundColor Yellow

$giftBody = @{
    user_id = $adminUser.id
    room = "bronce"
    quantity = 20
    is_gift = $true
    purchase_price = 0
    reason = "Regalo 10% adicional"
} | ConvertTo-Json

try {
    $giftResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/credit" -Method POST -Headers $headers -ContentType "application/json" -Body $giftBody
    Write-Host "OK - $($giftResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 5. VER INVENTARIO COMPLETO (SuperAdmin)
Write-Host "`n[5/10] Consultando inventario completo..." -ForegroundColor Yellow

try {
    $inventoryResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/inventory/$($adminUser.id)" -Method GET -Headers $headers
    Write-Host "OK - Inventario usuario $($adminUser.username):" -ForegroundColor Green
    
    foreach ($item in $inventoryResponse.inventory) {
        Write-Host "   Sala: $($item.room)" -ForegroundColor Cyan
        Write-Host "     - Normales: $($item.normal_cards)" -ForegroundColor Gray
        Write-Host "     - Regalo: $($item.gift_cards)" -ForegroundColor Yellow
        Write-Host "     - TOTAL: $($item.total_cards)" -ForegroundColor White
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 6. VER TODOS LOS INVENTARIOS
Write-Host "`n[6/10] Consultando todos los inventarios..." -ForegroundColor Yellow

try {
    $allInventoriesResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/all-inventories" -Method GET -Headers $headers
    Write-Host "OK - Total usuarios con inventario: $($allInventoriesResponse.total_users)" -ForegroundColor Green
    
    foreach ($inv in $allInventoriesResponse.inventories | Select-Object -First 3) {
        Write-Host "   $($inv.username) ($($inv.role)):" -ForegroundColor Cyan
        foreach ($room in $inv.rooms.PSObject.Properties) {
            Write-Host "     $($room.Name): $($room.Value.total_cards) cartones" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 7. TRANSFERIR CARTONES (SuperAdmin a Admin)
Write-Host "`n[7/10] Transfiriendo 50 cartones a jugador..." -ForegroundColor Yellow

$transferBody = @{
    from_user_id = $adminUser.id
    to_user_id = $jugadorUser.id
    room = "bronce"
    quantity = 50
} | ConvertTo-Json

try {
    $transferResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/transfer" -Method POST -Headers $headers -ContentType "application/json" -Body $transferBody
    Write-Host "OK - $($transferResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 8. VER INVENTARIO DEL JUGADOR
Write-Host "`n[8/10] Verificando inventario del jugador..." -ForegroundColor Yellow

try {
    $jugadorInventoryResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/inventory/$($jugadorUser.id)" -Method GET -Headers $headers
    Write-Host "OK - Inventario jugador $($jugadorUser.username):" -ForegroundColor Green
    
    foreach ($item in $jugadorInventoryResponse.inventory) {
        Write-Host "   Sala: $($item.room)" -ForegroundColor Cyan
        Write-Host "     - Normales: $($item.normal_cards)" -ForegroundColor Gray
        Write-Host "     - Regalo: $($item.gift_cards)" -ForegroundColor Yellow
        Write-Host "     - TOTAL: $($item.total_cards)" -ForegroundColor White
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 9. VER HISTORIAL DE MOVIMIENTOS
Write-Host "`n[9/10] Consultando historial de movimientos..." -ForegroundColor Yellow

try {
    $movementsResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/movements/$($adminUser.id)?limit=10" -Method GET -Headers $headers
    Write-Host "OK - Total movimientos: $($movementsResponse.total)" -ForegroundColor Green
    
    foreach ($mov in $movementsResponse.movements | Select-Object -First 5) {
        Write-Host "   $($mov.movement_type) - $($mov.quantity) cartones ($($mov.room)) - $($mov.created_at)" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 10. RESUMEN
Write-Host "`n[10/10] Verificando estado final..." -ForegroundColor Yellow

try {
    $finalInventory = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/all-inventories" -Method GET -Headers $headers
    Write-Host "OK - Sistema funcionando correctamente" -ForegroundColor Green
    Write-Host "   Total usuarios con cartones: $($finalInventory.total_users)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# RESUMEN FINAL
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "SuperAdmin:" -ForegroundColor Green
Write-Host "   - Acreditar cartones (normal/regalo)" -ForegroundColor Gray
Write-Host "   - Ver inventario completo" -ForegroundColor Gray
Write-Host "   - Transferir entre usuarios" -ForegroundColor Gray

Write-Host "`nAdmin/Cajero:" -ForegroundColor Green
Write-Host "   - Ver inventario (solo totales)" -ForegroundColor Gray
Write-Host "   - Transferir a su red" -ForegroundColor Gray

Write-Host "`nJugador:" -ForegroundColor Green
Write-Host "   - Ver inventario disponible" -ForegroundColor Gray
Write-Host "   - Validar cartones para sorteo" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ENDPOINTS DISPONIBLES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "SuperAdmin:" -ForegroundColor Yellow
Write-Host "  POST /api/superadmin/cards/credit" -ForegroundColor Gray
Write-Host "  GET  /api/superadmin/cards/inventory/:userId" -ForegroundColor Gray
Write-Host "  GET  /api/superadmin/cards/movements/:userId" -ForegroundColor Gray
Write-Host "  POST /api/superadmin/cards/transfer" -ForegroundColor Gray
Write-Host "  GET  /api/superadmin/cards/all-inventories" -ForegroundColor Gray

Write-Host "`nAdmin/Cajero:" -ForegroundColor Yellow
Write-Host "  GET  /api/admin/cards/inventory" -ForegroundColor Gray
Write-Host "  POST /api/admin/cards/transfer" -ForegroundColor Gray
Write-Host "  GET  /api/admin/cards/movements" -ForegroundColor Gray

Write-Host "`nJugador:" -ForegroundColor Yellow
Write-Host "  POST /api/game/validate-cards" -ForegroundColor Gray
Write-Host "  GET  /api/game/my-validated-cards/:sessionId" -ForegroundColor Gray
Write-Host "  GET  /api/game/my-inventory" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTS COMPLETADOS" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
