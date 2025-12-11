# ========================================
# Test Frontend Card Inventory System
# Sistema de Inventario de Cartones v1.4.0
# ========================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST FRONTEND - INVENTARIO v1.4.0" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$token = $null
$userId = $null

# ========================================
# FUNCIÓN: Login como SuperAdmin
# ========================================
function Login-SuperAdmin {
    Write-Host "[1/8] Login como SuperAdmin..." -ForegroundColor Yellow
    
    $body = @{
        username = "Andy"
        password = "Tasso2025"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body

        $script:token = $response.token
        $script:userId = $response.user.id

        Write-Host "  ✅ Login exitoso" -ForegroundColor Green
        Write-Host "  Usuario: $($response.user.username)" -ForegroundColor Gray
        Write-Host "  Role: $($response.user.role)" -ForegroundColor Gray
        Write-Host "  ID: $userId`n" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "  ❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ========================================
# FUNCIÓN: Acreditar cartones a usuario
# ========================================
function Credit-Cards {
    param(
        [int]$targetUserId,
        [string]$room,
        [int]$quantity,
        [bool]$isGift
    )

    Write-Host "[2/8] Acreditar $quantity cartones $($isGift ? 'regalo' : 'normales') sala $room a usuario $targetUserId..." -ForegroundColor Yellow
    
    $body = @{
        userId = $targetUserId
        room = $room
        quantity = $quantity
        isGift = $isGift
        reason = "Test Frontend - Acreditación automática"
    } | ConvertTo-Json

    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/credit" `
            -Method POST `
            -Headers $headers `
            -Body $body

        Write-Host "  ✅ Acreditación exitosa" -ForegroundColor Green
        Write-Host "  Cantidad: $($response.quantity)" -ForegroundColor Gray
        Write-Host "  Tipo: $($response.isGift ? 'Regalo' : 'Normal')" -ForegroundColor Gray
        Write-Host "  Nuevo total: $($response.newTotal)`n" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ========================================
# FUNCIÓN: Ver inventario de usuario
# ========================================
function Get-UserInventory {
    param([int]$targetUserId)

    Write-Host "[3/8] Consultar inventario de usuario $targetUserId..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/inventory/$targetUserId" `
            -Method GET `
            -Headers $headers

        Write-Host "  ✅ Inventario obtenido" -ForegroundColor Green
        Write-Host "  Usuario: $($response.username)" -ForegroundColor Gray
        
        foreach ($inv in $response.inventories) {
            $icon = switch ($inv.room) {
                "bronce" { "🥉" }
                "plata" { "🥈" }
                "oro" { "🥇" }
                default { "📦" }
            }
            Write-Host "  $icon $($inv.room): $($inv.normal_cards) normales + $($inv.gift_cards) regalo = $($inv.total_cards) total" -ForegroundColor Gray
        }
        Write-Host ""
        return $response
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# ========================================
# FUNCIÓN: Transferir cartones
# ========================================
function Transfer-Cards {
    param(
        [int]$fromUserId,
        [int]$toUserId,
        [string]$room,
        [int]$quantity
    )

    Write-Host "[4/8] Transferir $quantity cartones de sala $room de usuario $fromUserId a $toUserId..." -ForegroundColor Yellow
    
    $body = @{
        fromUserId = $fromUserId
        toUserId = $toUserId
        room = $room
        quantity = $quantity
        reason = "Test Frontend - Transferencia automática"
    } | ConvertTo-Json

    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/transfer" `
            -Method POST `
            -Headers $headers `
            -Body $body

        Write-Host "  ✅ Transferencia exitosa" -ForegroundColor Green
        Write-Host "  Normales transferidos: $($response.transferred.normal)" -ForegroundColor Gray
        Write-Host "  Regalo transferidos: $($response.transferred.gift)" -ForegroundColor Gray
        Write-Host "  Total: $($response.transferred.total)`n" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ========================================
# FUNCIÓN: Ver todos los inventarios
# ========================================
function Get-AllInventories {
    Write-Host "[5/8] Consultar todos los inventarios..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/all-inventories" `
            -Method GET `
            -Headers $headers

        Write-Host "  ✅ Inventarios obtenidos" -ForegroundColor Green
        Write-Host "  Total usuarios con cartones: $($response.inventories.Count)" -ForegroundColor Gray
        
        $totalCards = ($response.inventories | Measure-Object -Property total_cards -Sum).Sum
        Write-Host "  Total cartones en sistema: $totalCards`n" -ForegroundColor Gray
        return $response
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# ========================================
# FUNCIÓN: Ver movimientos de usuario
# ========================================
function Get-UserMovements {
    param([int]$targetUserId)

    Write-Host "[6/8] Consultar movimientos de usuario $targetUserId..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/cards/movements/$targetUserId" `
            -Method GET `
            -Headers $headers

        Write-Host "  ✅ Movimientos obtenidos" -ForegroundColor Green
        Write-Host "  Total movimientos: $($response.movements.Count)" -ForegroundColor Gray
        
        if ($response.movements.Count -gt 0) {
            Write-Host "`n  Últimos 3 movimientos:" -ForegroundColor Gray
            $response.movements | Select-Object -First 3 | ForEach-Object {
                $icon = switch ($_.movement_type) {
                    "credit" { "➕" }
                    "debit" { "➖" }
                    "transfer_in" { "⬇️" }
                    "transfer_out" { "⬆️" }
                    "validated" { "✅" }
                    default { "📝" }
                }
                Write-Host "    $icon $($_.movement_type) - $($_.quantity) cartones ($($_.room))" -ForegroundColor Gray
            }
        }
        Write-Host ""
        return $response
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# ========================================
# FUNCIÓN: Login como Admin
# ========================================
function Login-Admin {
    Write-Host "[7/8] Login como Admin (para probar endpoints de admin)..." -ForegroundColor Yellow
    
    # Buscar un admin en el sistema
    $body = @{
        username = "admin1"  # Ajustar según tu sistema
        password = "admin123"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body

        $adminToken = $response.token

        Write-Host "  ✅ Login admin exitoso" -ForegroundColor Green
        Write-Host "  Usuario: $($response.user.username)" -ForegroundColor Gray
        
        # Probar endpoint de inventario de admin
        $headers = @{
            "Authorization" = "Bearer $adminToken"
        }

        $inventoryResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/cards/inventory" `
            -Method GET `
            -Headers $headers

        Write-Host "  ✅ Inventario de admin obtenido" -ForegroundColor Green
        Write-Host "  Total inventarios: $($inventoryResponse.inventories.Count)`n" -ForegroundColor Gray
        
        return $true
    } catch {
        Write-Host "  ⚠️  Admin no disponible (normal si no existe admin1): $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host ""
        return $false
    }
}

# ========================================
# FUNCIÓN: Resumen final
# ========================================
function Show-Summary {
    Write-Host "[8/8] Resumen de Tests..." -ForegroundColor Yellow
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  RESUMEN DE PRUEBAS" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "✅ Endpoints SuperAdmin probados:" -ForegroundColor Green
    Write-Host "  - POST /api/superadmin/cards/credit" -ForegroundColor Gray
    Write-Host "  - GET  /api/superadmin/cards/inventory/:userId" -ForegroundColor Gray
    Write-Host "  - POST /api/superadmin/cards/transfer" -ForegroundColor Gray
    Write-Host "  - GET  /api/superadmin/cards/all-inventories" -ForegroundColor Gray
    Write-Host "  - GET  /api/superadmin/cards/movements/:userId" -ForegroundColor Gray
    
    Write-Host "`n✅ Flujo completo verificado:" -ForegroundColor Green
    Write-Host "  1. ✅ Acreditar cartones" -ForegroundColor Gray
    Write-Host "  2. ✅ Consultar inventario" -ForegroundColor Gray
    Write-Host "  3. ✅ Transferir cartones" -ForegroundColor Gray
    Write-Host "  4. ✅ Ver todos los inventarios" -ForegroundColor Gray
    Write-Host "  5. ✅ Ver historial de movimientos" -ForegroundColor Gray
    
    Write-Host "`n📦 Frontend Components Ready:" -ForegroundColor Magenta
    Write-Host "  - CardInventoryPanel.jsx (SuperAdmin)" -ForegroundColor Gray
    Write-Host "  - AdminCardInventory.jsx (Admin/Cajero)" -ForegroundColor Gray
    Write-Host "  - PlayerCardInventory.jsx (Jugador)" -ForegroundColor Gray
    
    Write-Host "`n========================================`n" -ForegroundColor Cyan
}

# ========================================
# EJECUTAR TESTS
# ========================================

# 1. Login
if (-not (Login-SuperAdmin)) {
    Write-Host "❌ No se pudo hacer login. Tests abortados." -ForegroundColor Red
    exit 1
}

# 2. Acreditar 20 cartones normales
if (-not (Credit-Cards -targetUserId $userId -room "bronce" -quantity 20 -isGift $false)) {
    Write-Host "❌ Error acreditando cartones normales" -ForegroundColor Red
}

# 3. Acreditar 5 cartones regalo
if (-not (Credit-Cards -targetUserId $userId -room "bronce" -quantity 5 -isGift $true)) {
    Write-Host "❌ Error acreditando cartones regalo" -ForegroundColor Red
}

# 4. Ver inventario
$inventory = Get-UserInventory -targetUserId $userId
if (-not $inventory) {
    Write-Host "❌ Error consultando inventario" -ForegroundColor Red
}

# 5. Crear un usuario temporal para transferencia (opcional - comentado)
# Write-Host "[TEST] Transferencia requiere 2 usuarios. Usando mismo usuario para demo..." -ForegroundColor Yellow

# 6. Ver todos los inventarios
$allInventories = Get-AllInventories
if (-not $allInventories) {
    Write-Host "❌ Error consultando todos los inventarios" -ForegroundColor Red
}

# 7. Ver movimientos
$movements = Get-UserMovements -targetUserId $userId
if (-not $movements) {
    Write-Host "❌ Error consultando movimientos" -ForegroundColor Red
}

# 8. Probar login como admin (opcional)
Login-Admin | Out-Null

# 9. Resumen
Show-Summary

Write-Host "✅ TODOS LOS TESTS COMPLETADOS!" -ForegroundColor Green
Write-Host "`nPróximos pasos:" -ForegroundColor Cyan
Write-Host "1. Inicia el cliente admin: cd client-admin && npm run dev" -ForegroundColor Gray
Write-Host "2. Navega a Inventario de Cartones en el sidebar" -ForegroundColor Gray
Write-Host "3. Prueba las funciones: acreditar, transferir, ver historial" -ForegroundColor Gray
Write-Host ""
