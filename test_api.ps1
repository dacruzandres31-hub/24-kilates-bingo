# ==========================================
# TESTING MANUAL - API ENDPOINTS
# Bingo 24K - v1.3.0
# ==========================================

$BaseURL = "http://localhost:3001"
$Headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🧪 TESTING API - BINGO 24K          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ==========================================
# TEST 1: HEALTH CHECK
# ==========================================
Write-Host "🔍 TEST 1: Health Check" -ForegroundColor Yellow
Write-Host "GET $BaseURL/health" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/health" -Method Get -Headers $Headers
    Write-Host "✅ PASS - Health OK" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Scheduler: $($response.scheduler.status)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ FAIL - Health check failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Start-Sleep -Seconds 1

# ==========================================
# TEST 2: REGISTRO DE USUARIO
# ==========================================
Write-Host "🔍 TEST 2: Registro de Usuario" -ForegroundColor Yellow
Write-Host "POST $BaseURL/api/auth/register" -ForegroundColor Gray

$timestamp = Get-Date -Format "HHmmss"
$registerBody = @{
    username = "testuser_$timestamp"
    password = "Test123!"
    role = "player"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/register" -Method Post -Headers $Headers -Body $registerBody
    Write-Host "✅ PASS - Usuario registrado" -ForegroundColor Green
    Write-Host "   User ID: $($response.user.id)" -ForegroundColor Gray
    Write-Host "   Username: $($response.user.username)" -ForegroundColor Gray
    Write-Host "   Role: $($response.user.role)" -ForegroundColor Gray
    Write-Host "   Balance: $($response.user.balance)" -ForegroundColor Gray
    
    # Guardar token y userId para tests siguientes
    $global:Token = $response.token
    $global:UserId = $response.user.id
    $global:Username = $response.user.username
    Write-Host "   🔑 Token guardado para tests siguientes" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "❌ FAIL - Registro falló" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Start-Sleep -Seconds 1

# ==========================================
# TEST 3: LOGIN
# ==========================================
Write-Host "🔍 TEST 3: Login" -ForegroundColor Yellow
Write-Host "POST $BaseURL/api/auth/login" -ForegroundColor Gray

$loginBody = @{
    username = $global:Username
    password = "Test123!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/login" -Method Post -Headers $Headers -Body $loginBody
    Write-Host "✅ PASS - Login exitoso" -ForegroundColor Green
    Write-Host "   User ID: $($response.user.id)" -ForegroundColor Gray
    Write-Host "   Username: $($response.user.username)" -ForegroundColor Gray
    Write-Host "   Token: $($response.token.Substring(0,20))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ FAIL - Login falló" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Start-Sleep -Seconds 1

# ==========================================
# TEST 4: VERIFY TOKEN
# ==========================================
Write-Host "🔍 TEST 4: Verificar Token" -ForegroundColor Yellow
Write-Host "GET $BaseURL/api/auth/verify" -ForegroundColor Gray

$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $global:Token"
}

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/verify" -Method Get -Headers $authHeaders
    Write-Host "✅ PASS - Token válido" -ForegroundColor Green
    Write-Host "   Valid: $($response.valid)" -ForegroundColor Gray
    Write-Host "   User ID: $($response.user.userId)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ FAIL - Token inválido" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Start-Sleep -Seconds 1

# ==========================================
# TEST 5: BALANCE DE FICHAS
# ==========================================
Write-Host "🔍 TEST 5: Ver Balance de Fichas" -ForegroundColor Yellow
Write-Host "GET $BaseURL/api/chips/balance/$global:UserId" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/chips/balance/$global:UserId" -Method Get -Headers $authHeaders
    Write-Host "✅ PASS - Balance obtenido" -ForegroundColor Green
    Write-Host "   Balance: $($response.balance)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ FAIL - No se pudo obtener balance" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Start-Sleep -Seconds 1

# ==========================================
# TEST 6: PROGRESO DE GAMIFICACIÓN
# ==========================================
Write-Host "🔍 TEST 6: Progreso de Gamificación" -ForegroundColor Yellow
Write-Host "GET $BaseURL/api/gamification/progress" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/progress" -Method Get -Headers $authHeaders
    Write-Host "✅ PASS - Progreso obtenido" -ForegroundColor Green
    
    if ($response.progress) {
        Write-Host "   Level: $($response.progress.current_level)" -ForegroundColor Gray
        Write-Host "   XP: $($response.progress.xp_current)/$($response.progress.xp_required)" -ForegroundColor Gray
    } else {
        Write-Host "   Usuario nuevo - Sin progreso aún" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "❌ FAIL - Error obteniendo progreso" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Start-Sleep -Seconds 1

# ==========================================
# TEST 7: NIVELES DISPONIBLES
# ==========================================
Write-Host "🔍 TEST 7: Niveles Disponibles" -ForegroundColor Yellow
Write-Host "GET $BaseURL/api/gamification/levels" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/levels" -Method Get -Headers $authHeaders
    Write-Host "✅ PASS - Niveles obtenidos" -ForegroundColor Green
    
    if ($response.levels) {
        Write-Host "   Total niveles: $($response.levels.Count)" -ForegroundColor Gray
        Write-Host "   Max level: $($response.levels[-1].level_number)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "❌ FAIL - Error obteniendo niveles" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Start-Sleep -Seconds 1

# ==========================================
# TEST 8: INVENTARIO
# ==========================================
Write-Host "🔍 TEST 8: Mi Inventario" -ForegroundColor Yellow
Write-Host "GET $BaseURL/api/inventory" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/inventory" -Method Get -Headers $authHeaders
    Write-Host "✅ PASS - Inventario obtenido" -ForegroundColor Green
    
    if ($response.items) {
        Write-Host "   Total items: $($response.items.Count)" -ForegroundColor Gray
    } else {
        Write-Host "   Inventario vacío" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "❌ FAIL - Error obteniendo inventario" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# ==========================================
# RESUMEN FINAL
# ==========================================
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   📊 RESUMEN DE TESTS                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Usuario de prueba creado:" -ForegroundColor White
Write-Host "  Username: $global:Username" -ForegroundColor Gray
Write-Host "  User ID: $global:UserId" -ForegroundColor Gray
Write-Host "  Token: $($global:Token.Substring(0,30))..." -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Tests básicos completados" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos tests recomendados:" -ForegroundColor Yellow
Write-Host "  - Depósito de fichas (requiere role admin)" -ForegroundColor Gray
Write-Host "  - Compra de cartones" -ForegroundColor Gray
Write-Host "  - Solicitud de retiro" -ForegroundColor Gray
Write-Host "  - Dashboard de admin" -ForegroundColor Gray
Write-Host ""

Write-Host "🔗 Para tests avanzados, ejecuta:" -ForegroundColor Cyan
Write-Host "   .\test_api_advanced.ps1" -ForegroundColor White
Write-Host ""
