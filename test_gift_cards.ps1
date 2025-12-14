# Test Gift Cards System
# Fecha: 13-DIC-2025

$baseUrl = "http://localhost:3001/api"

Write-Host ""
Write-Host "SISTEMA DE CARTONES DE REGALO - TEST COMPLETO" -ForegroundColor Cyan
Write-Host ""

# 1. Login como SuperAdmin (Andy)
Write-Host "1. Login como SuperAdmin..." -ForegroundColor Yellow
$loginBody = @{
    username = "TestGiftAdmin"
    password = "GiftTest123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    
    if (-not $loginResponse.token) {
        Write-Host "Error en login - token no recibido" -ForegroundColor Red
        exit 1
    }
    
    $token = $loginResponse.token
    Write-Host "Login exitoso - Usuario: $($loginResponse.user.username)" -ForegroundColor Green
} catch {
    Write-Host "Error en login: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Crear usuario de prueba
Write-Host ""
Write-Host "2. Creando usuario de prueba..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$testUsername = "testgift_$timestamp"

$createUserBody = @{
    username = $testUsername
    password = "Test1234!"
    role = "jugador"
} | ConvertTo-Json

try {
    $createUserResponse = Invoke-RestMethod -Uri "$baseUrl/admin/users/create" -Method Post -Headers $headers -Body $createUserBody
    $testUserId = $createUserResponse.userId
    Write-Host "Usuario creado - ID: $testUserId, Username: $testUsername" -ForegroundColor Green
} catch {
    Write-Host "Error creando usuario: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
    exit 1
}

# 3. Agregar cartones de regalo
Write-Host ""
Write-Host "3. Agregando cartones de regalo..." -ForegroundColor Yellow

$rooms = @('bronce', 'plata', 'oro')
foreach ($room in $rooms) {
    $addBody = @{
        userId = $testUserId
        room = $room
        quantity = 5
    } | ConvertTo-Json
    
    try {
        $addResponse = Invoke-RestMethod -Uri "$baseUrl/admin/gift-cards/add" -Method Post -Headers $headers -Body $addBody
        Write-Host "  OK $room : 5 cartones agregados" -ForegroundColor Green
    } catch {
        Write-Host "  Error en $room : $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) { Write-Host "    $($_.ErrorDetails.Message)" -ForegroundColor Gray }
    }
}

# 4. Consultar stock
Write-Host ""
Write-Host "4. Consultando stock..." -ForegroundColor Yellow
try {
    $stockResponse = Invoke-RestMethod -Uri "$baseUrl/admin/gift-cards/stock/$testUserId" -Method Get -Headers $headers
    Write-Host "  Stock de cartones de regalo:" -ForegroundColor Cyan
    Write-Host "     Bronce: $($stockResponse.stock.bronce)" -ForegroundColor White
    Write-Host "     Plata: $($stockResponse.stock.plata)" -ForegroundColor White
    Write-Host "     Oro: $($stockResponse.stock.oro)" -ForegroundColor White
} catch {
    Write-Host "  Error consultando stock: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) { Write-Host "  $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# 5. Consultar historial
Write-Host ""
Write-Host "5. Consultando historial..." -ForegroundColor Yellow
try {
    $historyResponse = Invoke-RestMethod -Uri "$baseUrl/admin/gift-cards/history/$testUserId" -Method Get -Headers $headers
    Write-Host "  Movimientos registrados: $($historyResponse.movements.Count)" -ForegroundColor Green
} catch {
    Write-Host "  Error consultando historial" -ForegroundColor Red
}

# 6. Quitar cartones
Write-Host ""
Write-Host "6. Quitando 2 cartones de bronce..." -ForegroundColor Yellow
$removeBody = @{
    userId = $testUserId
    room = "bronce"
    quantity = 2
} | ConvertTo-Json

try {
    $removeResponse = Invoke-RestMethod -Uri "$baseUrl/admin/gift-cards/remove" -Method Post -Headers $headers -Body $removeBody
    Write-Host "  Cartones removidos - Nuevo stock: $($removeResponse.newStock)" -ForegroundColor Green
} catch {
    Write-Host "  Error removiendo cartones" -ForegroundColor Red
}

# 7. Stock final
Write-Host ""
Write-Host "7. Stock final..." -ForegroundColor Yellow
try {
    $finalStock = Invoke-RestMethod -Uri "$baseUrl/admin/gift-cards/stock/$testUserId" -Method Get -Headers $headers
    Write-Host "  Bronce: $($finalStock.stock.bronce)" -ForegroundColor White
    Write-Host "  Plata: $($finalStock.stock.plata)" -ForegroundColor White
    Write-Host "  Oro: $($finalStock.stock.oro)" -ForegroundColor White
} catch {
    Write-Host "  Error" -ForegroundColor Red
}

Write-Host ""
Write-Host "TEST COMPLETO" -ForegroundColor Green
Write-Host "Usuario: $testUsername (ID: $testUserId)" -ForegroundColor Cyan
Write-Host ""
