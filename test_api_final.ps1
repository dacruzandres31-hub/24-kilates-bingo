# Testing Final API - Endpoints Reales
# Bingo 24K

$BaseURL = "http://localhost:3001"
$Headers = @{"Content-Type" = "application/json"}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TESTING API - BINGO 24K" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$PassCount = 0
$FailCount = 0

# TEST 1: Health
Write-Host "[1/8] Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/health" -Method Get -Headers $Headers
    Write-Host " PASS - Status: $($response.status)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $FailCount++
}
Start-Sleep -Milliseconds 500

# TEST 2: Registro
Write-Host "`n[2/8] Registro de usuario..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$registerBody = @{
    username = "test_$timestamp"
    password = "Test123!"
    role = "jugador"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/register" -Method Post -Headers $Headers -Body $registerBody
    Write-Host " PASS - User: $($response.user.username) | ID: $($response.user.id)" -ForegroundColor Green
    $global:Token = $response.token
    $global:UserId = $response.user.id
    $global:Username = $response.user.username
    $PassCount++
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $FailCount++
}
Start-Sleep -Milliseconds 500

# TEST 3: Login
Write-Host "`n[3/8] Login..." -ForegroundColor Yellow
$loginBody = @{
    username = $global:Username
    password = "Test123!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/login" -Method Post -Headers $Headers -Body $loginBody
    Write-Host " PASS - Login exitoso" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $FailCount++
}
Start-Sleep -Milliseconds 500

# Configurar headers autenticados
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $global:Token"
}

# TEST 4: Verify Token
Write-Host "`n[4/8] Verificar token..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/verify" -Method Get -Headers $authHeaders
    Write-Host " PASS - Token valido" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $FailCount++
}
Start-Sleep -Milliseconds 500

# TEST 5: Niveles
Write-Host "`n[5/8] Niveles disponibles..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/levels" -Method Get -Headers $authHeaders
    Write-Host " PASS - Total niveles: $($response.levels.Count)" -ForegroundColor Green
    if ($response.levels.Count -gt 0) {
        $firstLevel = $response.levels[0]
        Write-Host "   Nivel 1: $($firstLevel.level_name) | XP: $($firstLevel.xp_required)" -ForegroundColor Gray
    }
    $PassCount++
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $FailCount++
}
Start-Sleep -Milliseconds 500

# TEST 6: Top Players
Write-Host "`n[6/8] Top jugadores..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/top-players?limit=5" -Method Get -Headers $authHeaders
    Write-Host " PASS - Jugadores en top: $($response.topPlayers.Count)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $FailCount++
}
Start-Sleep -Milliseconds 500

# TEST 7: Inventario
Write-Host "`n[7/8] Mi inventario..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/inventory" -Method Get -Headers $authHeaders
    Write-Host " PASS - Items: $($response.items.Count)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $FailCount++
}
Start-Sleep -Milliseconds 500

# TEST 8: Quests
Write-Host "`n[8/8] Misiones diarias..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/quests" -Method Get -Headers $authHeaders
    Write-Host " PASS - Misiones: $($response.quests.Count)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $FailCount++
}

# Resumen Final
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Usuario: $global:Username (ID: $global:UserId)" -ForegroundColor White
Write-Host "Token: $($global:Token.Substring(0,40))..." -ForegroundColor DarkGray

Write-Host "`nResultados:" -ForegroundColor White
Write-Host " PASS: $PassCount / 8" -ForegroundColor Green
Write-Host " FAIL: $FailCount / 8" -ForegroundColor $(if ($FailCount -eq 0) { "Green" } else { "Red" })

$porcentaje = [math]::Round(($PassCount / 8) * 100, 1)
Write-Host "`nExito: $porcentaje%" -ForegroundColor $(if ($porcentaje -ge 90) { "Green" } elseif ($porcentaje -ge 70) { "Yellow" } else { "Red" })

if ($PassCount -eq 8) {
    Write-Host "`n[EXITO] Todos los endpoints funcionan correctamente!" -ForegroundColor Green
} elseif ($PassCount -ge 6) {
    Write-Host "`n[ACEPTABLE] Sistema funcional, algunos endpoints con issues" -ForegroundColor Yellow
} else {
    Write-Host "`n[ERROR] Sistema requiere revision inmediata" -ForegroundColor Red
}

Write-Host "`nServidor: http://localhost:3001" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
