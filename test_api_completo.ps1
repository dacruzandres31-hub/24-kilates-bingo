# Testing Completo API - Bingo 24K
# Incluye inicializacion de gamificacion

$BaseURL = "http://localhost:3001"
$Headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n=== TESTING COMPLETO BINGO 24K ===`n" -ForegroundColor Cyan

$PassCount = 0
$FailCount = 0

# TEST 1: Health
Write-Host "[1/10] Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/health" -Method Get -Headers $Headers
    Write-Host "PASS - Status: $($response.status)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Start-Sleep -Seconds 1

# TEST 2: Registro
Write-Host "`n[2/10] Registro de usuario..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$registerBody = @{
    username = "test_$timestamp"
    password = "Test123!"
    role = "jugador"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/register" -Method Post -Headers $Headers -Body $registerBody
    Write-Host "PASS - Usuario: $($response.user.username) (ID: $($response.user.id))" -ForegroundColor Green
    $global:Token = $response.token
    $global:UserId = $response.user.id
    $global:Username = $response.user.username
    $PassCount++
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Start-Sleep -Seconds 1

# TEST 3: Login
Write-Host "`n[3/10] Login..." -ForegroundColor Yellow
$loginBody = @{
    username = $global:Username
    password = "Test123!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/login" -Method Post -Headers $Headers -Body $loginBody
    Write-Host "PASS - Token renovado" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Start-Sleep -Seconds 1

# Configurar headers autenticados
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $global:Token"
}

# TEST 4: Verify Token
Write-Host "`n[4/10] Verificar token..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/verify" -Method Get -Headers $authHeaders
    Write-Host "PASS - Token valido para user: $($response.user.username)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Start-Sleep -Seconds 1

# TEST 5: Inicializar Gamificacion
Write-Host "`n[5/10] Inicializar gamificacion..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/init" -Method Post -Headers $authHeaders
    Write-Host "PASS - Gamificacion inicializada" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL (puede estar ya inicializado) - $($_.Exception.Message)" -ForegroundColor Yellow
    $FailCount++
}

Start-Sleep -Seconds 1

# TEST 6: Progreso
Write-Host "`n[6/10] Consultar progreso..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/progress" -Method Get -Headers $authHeaders
    Write-Host "PASS - Level: $($response.progress.current_level), XP: $($response.progress.xp_current)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Start-Sleep -Seconds 1

# TEST 7: Niveles
Write-Host "`n[7/10] Niveles disponibles..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/levels" -Method Get -Headers $authHeaders
    Write-Host "PASS - Total niveles: $($response.levels.Count)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Start-Sleep -Seconds 1

# TEST 8: Inventario
Write-Host "`n[8/10] Inventario..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/inventory" -Method Get -Headers $authHeaders
    Write-Host "PASS - Items en inventario: $($response.items.Count)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Start-Sleep -Seconds 1

# TEST 9: Misiones Diarias
Write-Host "`n[9/10] Misiones diarias..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/missions/daily" -Method Get -Headers $authHeaders
    Write-Host "PASS - Misiones disponibles: $($response.missions.Count)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Start-Sleep -Seconds 1

# TEST 10: Ranking
Write-Host "`n[10/10] Ranking..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/ranking?period=weekly" -Method Get -Headers $authHeaders
    Write-Host "PASS - Jugadores en ranking: $($response.ranking.Count)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

# Resumen Final
Write-Host "`n=== RESUMEN FINAL ===" -ForegroundColor Cyan
Write-Host "Usuario creado: $global:Username (ID: $global:UserId)" -ForegroundColor White
Write-Host "Token: $($global:Token.Substring(0,40))..." -ForegroundColor Gray
Write-Host "`nTests PASS: $PassCount / 10" -ForegroundColor Green
Write-Host "Tests FAIL: $FailCount / 10" -ForegroundColor $(if ($FailCount -eq 0) { "Green" } else { "Yellow" })

if ($PassCount -ge 8) {
    Write-Host "`n[RESULTADO] Sistema funcionando correctamente!" -ForegroundColor Green
} elseif ($PassCount -ge 5) {
    Write-Host "`n[RESULTADO] Sistema funcional con algunos errores menores" -ForegroundColor Yellow
} else {
    Write-Host "`n[RESULTADO] Sistema requiere revision" -ForegroundColor Red
}

Write-Host "`nServidor: http://localhost:3001`n" -ForegroundColor Cyan
