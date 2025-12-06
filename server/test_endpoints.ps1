# Script de prueba de endpoints
Write-Host "🧪 PROBANDO ENDPOINTS DEL SERVIDOR BINGO 24K" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Health Check
Write-Host "1️⃣  Probando /health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
    Write-Host "✅ Health Check OK" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host "   Database: $($health.database)" -ForegroundColor Gray
    Write-Host "   Uptime: $($health.uptime)s" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error en /health: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 2. Registro de usuario de prueba
Write-Host "2️⃣  Probando registro de usuario..." -ForegroundColor Yellow
$testUser = @{
    username = "test_$(Get-Random -Minimum 1000 -Maximum 9999)"
    password = "Test1234!"
    email = "test_$(Get-Random -Minimum 1000 -Maximum 9999)@bingo24k.com"
    role = "jugador"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method Post -Body $testUser -ContentType "application/json"
    Write-Host "✅ Registro exitoso" -ForegroundColor Green
    Write-Host "   User ID: $($register.user.id)" -ForegroundColor Gray
    Write-Host "   Username: $($register.user.username)" -ForegroundColor Gray
    Write-Host "   Token: $($register.token.substring(0,20))..." -ForegroundColor Gray
    
    $global:testToken = $register.token
    $global:testUserId = $register.user.id
} catch {
    Write-Host "❌ Error en registro: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Login
Write-Host "3️⃣  Probando login..." -ForegroundColor Yellow
$loginData = @{
    username = "test_player"
    password = "password123"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Username: $($login.user.username)" -ForegroundColor Gray
    Write-Host "   Balance: $($login.user.balance)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Usuario de prueba no existe (normal en BD nueva)" -ForegroundColor Yellow
}
Write-Host ""

# 4. Obtener salas de juego
Write-Host "4️⃣  Probando obtención de salas..." -ForegroundColor Yellow
try {
    $rooms = Invoke-RestMethod -Uri "http://localhost:3001/api/game/rooms" -Method Get
    Write-Host "✅ Salas obtenidas: $($rooms.Count)" -ForegroundColor Green
    foreach ($room in $rooms) {
        Write-Host "   - $($room.name): $($room.cardPrice) fichas" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error obteniendo salas: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 5. Stock disponible
Write-Host "5️⃣  Probando stock disponible..." -ForegroundColor Yellow
try {
    $today = Get-Date -Format "yyyy-MM-dd"
    $stock = Invoke-RestMethod -Uri "http://localhost:3001/api/game/stock/availability?playDate=$today" -Method Get
    Write-Host "✅ Stock disponible obtenido" -ForegroundColor Green
    foreach ($s in $stock) {
        Write-Host "   - Sala $($s.room): $($s.available_count) cartones disponibles" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  No hay stock generado (normal en BD nueva)" -ForegroundColor Yellow
}
Write-Host ""

# 6. Sistema de gamificación
Write-Host "6️⃣  Probando sistema de gamificación..." -ForegroundColor Yellow
if ($global:testToken) {
    try {
        $headers = @{ "Authorization" = "Bearer $global:testToken" }
        $gamification = Invoke-RestMethod -Uri "http://localhost:3001/api/gamification/profile" -Method Get -Headers $headers
        Write-Host "✅ Perfil de gamificación obtenido" -ForegroundColor Green
        Write-Host "   Nivel: $($gamification.level)" -ForegroundColor Gray
        Write-Host "   XP: $($gamification.currentXP)/$($gamification.nextLevelXP)" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Error en gamificación: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  No hay token de prueba disponible" -ForegroundColor Yellow
}
Write-Host ""

# 7. Inventario de cosméticos
Write-Host "7️⃣  Probando sistema de inventario..." -ForegroundColor Yellow
if ($global:testToken) {
    try {
        $headers = @{ "Authorization" = "Bearer $global:testToken" }
        $inventory = Invoke-RestMethod -Uri "http://localhost:3001/api/inventory" -Method Get -Headers $headers
        Write-Host "✅ Inventario obtenido: $($inventory.Count) ítems" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Error en inventario: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  No hay token de prueba disponible" -ForegroundColor Yellow
}
Write-Host ""

# 8. Shop de tickets
Write-Host "8️⃣  Probando shop de tickets..." -ForegroundColor Yellow
try {
    $tickets = Invoke-RestMethod -Uri "http://localhost:3001/api/shop/tickets" -Method Get
    Write-Host "✅ Tickets disponibles: $($tickets.Count)" -ForegroundColor Green
    foreach ($ticket in $tickets | Select-Object -First 3) {
        Write-Host "   - $($ticket.name): $($ticket.price) fichas ($($ticket.type))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error obteniendo tickets: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Resumen final
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ PRUEBAS COMPLETADAS" -ForegroundColor Green
Write-Host "Servidor respondiendo en http://localhost:3001" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
