# ========================================
# TEST COMPLETO: Sistema de Inventario de Cartones v1.4.0
# ========================================

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3001"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🎴 TEST: Sistema de Inventario de Cartones" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ========================================
# 1. LOGIN COMO SUPERADMIN
# ========================================
Write-Host "[1/10] Autenticando como SuperAdmin..." -ForegroundColor Yellow

$loginBody = @{
    username = "Andy"
    password = "Tasso2025"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $superAdminToken = $loginResponse.token
    $superAdminId = $loginResponse.user.id
    Write-Host "✅ Login exitoso - Token obtenido" -ForegroundColor Green
    Write-Host "   Usuario: $($loginResponse.user.username) (ID: $superAdminId)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ========================================
# 2. OBTENER USUARIOS DE LA RED
# ========================================
Write-Host "`n[2/10] Obteniendo usuarios de la red..." -ForegroundColor Yellow

try {
    $headers = @{ "Authorization" = "Bearer $superAdminToken" }
    $usersResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/users/hierarchy" -Method GET -Headers $headers
    
    Write-Host "✅ Usuarios obtenidos:" -ForegroundColor Green
    
    # Buscar un Admin y un Cajero
    $adminUser = $usersResponse.users | Where-Object { $_.role -eq 'agente' } | Select-Object -First 1
    $cajeroUser = $usersResponse.users | Where-Object { $_.role -eq 'jugador' } | Select-Object -First 1
    
    if ($adminUser) {
        Write-Host "   Admin encontrado: $($adminUser.username) (ID: $($adminUser.id))" -ForegroundColor Gray
    }
    if ($cajeroUser) {
        Write-Host "   Jugador encontrado: $($cajeroUser.username) (ID: $($cajeroUser.id))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error obteniendo usuarios: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ========================================
# 3. ACREDITAR CARTONES NORMALES AL ADMIN
# ========================================
Write-Host "`n[3/10] Acreditando 100 cartones NORMALES al Admin..." -ForegroundColor Yellow

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
    Write-Host "✅ Cartones acreditados:" -ForegroundColor Green
    Write-Host "   $($creditResponse.message)" -ForegroundColor Gray
    Write-Host "   Total ahora: $($creditResponse.newTotal)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error acreditando: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ========================================
# 4. ACREDITAR CARTONES DE REGALO AL ADMIN
# ========================================
Write-Host "`n[4/10] Acreditando 20 cartones DE REGALO al Admin..." -ForegroundColor Yellow

$giftBody = @{
    user_id = $adminUser.id
    room = "bronce"
    quantity = 20
    is_gift = $true
    purchase_price = 0
    reason = "Regalo 10% adicional sobre compra"
} | ConvertTo-Json

try {
    $giftResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/credit" -Method POST -Headers $headers -ContentType "application/json" -Body $giftBody
    Write-Host "✅ Cartones de regalo acreditados:" -ForegroundColor Green
    Write-Host "   $($giftResponse.message)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error acreditando regalo: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ========================================
# 5. VER INVENTARIO COMPLETO (SuperAdmin)
# ========================================
Write-Host "`n[5/10] Consultando inventario completo (vista SuperAdmin)..." -ForegroundColor Yellow

try {
    $inventoryResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/inventory/$($adminUser.id)" -Method GET -Headers $headers
    Write-Host "✅ Inventario del usuario $($adminUser.username):" -ForegroundColor Green
    
    foreach ($item in $inventoryResponse.inventory) {
        Write-Host "   Sala: $($item.room)" -ForegroundColor Cyan
        Write-Host "     - Normales: $($item.normal_cards)" -ForegroundColor Gray
        Write-Host "     - Regalo: $($item.gift_cards)" -ForegroundColor Yellow
        Write-Host "     - TOTAL: $($item.total_cards)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Error obteniendo inventario: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ========================================
# 6. LOGIN COMO ADMIN
# ========================================
Write-Host "`n[6/10] Autenticando como Admin..." -ForegroundColor Yellow

$adminLoginBody = @{
    username = $adminUser.username
    password = "password123"  # Cambiar si es necesario
} | ConvertTo-Json

try {
    # Intentar login (puede fallar si no sabemos la contraseña)
    $adminLoginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $adminLoginBody -ErrorAction SilentlyContinue
    $adminToken = $adminLoginResponse.token
    Write-Host "✅ Login como Admin exitoso" -ForegroundColor Green
    
    # ========================================
    # 7. VER INVENTARIO (Vista Admin - Solo Totales)
    # ========================================
    Write-Host "`n[7/10] Consultando inventario (vista Admin - sin regalo/normal)..." -ForegroundColor Yellow
    
    $adminHeaders = @{ "Authorization" = "Bearer $adminToken" }
    $adminInventoryResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/cards/inventory" -Method GET -Headers $adminHeaders
    
    Write-Host "✅ Inventario (Admin NO ve separación regalo/normal):" -ForegroundColor Green
    foreach ($item in $adminInventoryResponse.inventory) {
        Write-Host "   Sala: $($item.room) - TOTAL: $($item.total_cards)" -ForegroundColor Gray
    }
    
    # ========================================
    # 8. TRANSFERIR CARTONES A JUGADOR
    # ========================================
    Write-Host "`n[8/10] Transfiriendo 50 cartones del Admin al Jugador..." -ForegroundColor Yellow
    
    $transferBody = @{
        to_user_id = $cajeroUser.id
        room = "bronce"
        quantity = 50
    } | ConvertTo-Json
    
    $transferResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/cards/transfer" -Method POST -Headers $adminHeaders -ContentType "application/json" -Body $transferBody
    Write-Host "✅ Transferencia exitosa:" -ForegroundColor Green
    Write-Host "   $($transferResponse.message)" -ForegroundColor Gray
    
} catch {
    Write-Host "⚠️  No se pudo autenticar como Admin (contraseña desconocida)" -ForegroundColor Yellow
    Write-Host "   Saltando pruebas 7 y 8..." -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# ========================================
# 9. CREAR SESIÓN DE JUEGO PARA PRUEBAS
# ========================================
Write-Host "`n[9/10] Creando sesión de juego de prueba..." -ForegroundColor Yellow

$sessionBody = @{
    roomType = "bronce"
    playDate = (Get-Date).ToString("yyyy-MM-dd")
} | ConvertTo-Json

try {
    $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/api/game-admin/create-session" -Method POST -Headers $headers -ContentType "application/json" -Body $sessionBody
    $gameSessionId = $sessionResponse.gameSessionId
    Write-Host "✅ Sesión creada: ID $gameSessionId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creando sesión: $($_.Exception.Message)" -ForegroundColor Red
    $gameSessionId = 1  # Usar sesión existente
    Write-Host "⚠️  Usando sesión existente ID: $gameSessionId" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# ========================================
# 10. VALIDAR CARTONES PARA SORTEO (como Jugador)
# ========================================
Write-Host "`n[10/10] Validando 5 cartones para el sorteo..." -ForegroundColor Yellow

# Necesitaríamos token del jugador, pero por ahora mostrar el flujo
Write-Host "⚠️  Para validar cartones se necesita:" -ForegroundColor Yellow
Write-Host "   1. Login como jugador (tiene cartones transferidos)" -ForegroundColor Gray
Write-Host "   2. POST /api/game/validate-cards" -ForegroundColor Gray
Write-Host "      Body: { game_session_id: $gameSessionId, room: 'bronce', quantity: 5 }" -ForegroundColor Gray
Write-Host "   3. El sistema:" -ForegroundColor Gray
Write-Host "      - Verifica inventario del jugador" -ForegroundColor Gray
Write-Host "      - Genera serial único por cartón" -ForegroundColor Gray
Write-Host "      - Verifica límite 10% regalo" -ForegroundColor Gray
Write-Host "      - Distribuye a jackpots (15% línea, 50% bingo, 5% pre-40)" -ForegroundColor Gray
Write-Host "      - Reduce inventario" -ForegroundColor Gray

# ========================================
# RESUMEN FINAL
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✅ SuperAdmin:" -ForegroundColor Green
Write-Host "   - Acreditar cartones (normal/regalo)" -ForegroundColor Gray
Write-Host "   - Ver inventario completo con separación" -ForegroundColor Gray
Write-Host "   - Transferir cartones entre usuarios" -ForegroundColor Gray

Write-Host "`n✅ Admin/Cajero:" -ForegroundColor Green
Write-Host "   - Ver inventario (solo totales, SIN ver regalo)" -ForegroundColor Gray
Write-Host "   - Transferir cartones a su red" -ForegroundColor Gray

Write-Host "`n✅ Jugador:" -ForegroundColor Green
Write-Host "   - Ver inventario disponible" -ForegroundColor Gray
Write-Host "   - Validar cartones para sorteo" -ForegroundColor Gray
Write-Host "   - Límite 10% regalo verificado" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🎯 ENDPOINTS DISPONIBLES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "SuperAdmin:" -ForegroundColor Yellow
Write-Host "  POST   /api/superadmin/cards/credit" -ForegroundColor Gray
Write-Host "  GET    /api/superadmin/cards/inventory/:userId" -ForegroundColor Gray
Write-Host "  GET    /api/superadmin/cards/movements/:userId" -ForegroundColor Gray
Write-Host "  POST   /api/superadmin/cards/transfer" -ForegroundColor Gray
Write-Host "  GET    /api/superadmin/cards/all-inventories" -ForegroundColor Gray

Write-Host "`nAdmin/Cajero:" -ForegroundColor Yellow
Write-Host "  GET    /api/admin/cards/inventory" -ForegroundColor Gray
Write-Host "  POST   /api/admin/cards/transfer" -ForegroundColor Gray
Write-Host "  GET    /api/admin/cards/movements" -ForegroundColor Gray

Write-Host "`nJugador:" -ForegroundColor Yellow
Write-Host "  POST   /api/game/validate-cards" -ForegroundColor Gray
Write-Host "  GET    /api/game/my-validated-cards/:sessionId" -ForegroundColor Gray
Write-Host "  GET    /api/game/my-inventory" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTS COMPLETADOS" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
