# Testing API - Bingo 24K
# PowerShell Script para testing manual

$BaseURL = "http://localhost:3001"
$Headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n=== TESTING API BINGO 24K ===`n" -ForegroundColor Cyan

# TEST 1: Health Check
Write-Host "[1/8] Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/health" -Method Get -Headers $Headers
    Write-Host "PASS - Status: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

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
    Write-Host "PASS - Usuario creado: $($response.user.username)" -ForegroundColor Green
    $global:Token = $response.token
    $global:UserId = $response.user.id
    $global:Username = $response.user.username
    Write-Host "Token guardado para tests siguientes" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# TEST 3: Login
Write-Host "`n[3/8] Login..." -ForegroundColor Yellow
$loginBody = @{
    username = $global:Username
    password = "Test123!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/login" -Method Post -Headers $Headers -Body $loginBody
    Write-Host "PASS - Login exitoso" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# TEST 4: Verify Token
Write-Host "`n[4/8] Verificar token..." -ForegroundColor Yellow
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $global:Token"
}

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/auth/verify" -Method Get -Headers $authHeaders
    Write-Host "PASS - Token valido" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# TEST 5: Balance
Write-Host "`n[5/8] Consultar balance..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/chips/balance/$global:UserId" -Method Get -Headers $authHeaders
    Write-Host "PASS - Balance: $($response.balance)" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# TEST 6: Progreso
Write-Host "`n[6/8] Progreso de gamificacion..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/progress" -Method Get -Headers $authHeaders
    Write-Host "PASS - Progreso obtenido" -ForegroundColor Green
    if ($response.progress) {
        Write-Host "Level: $($response.progress.current_level), XP: $($response.progress.xp_current)" -ForegroundColor Gray
    }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# TEST 7: Niveles
Write-Host "`n[7/8] Niveles disponibles..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/levels" -Method Get -Headers $authHeaders
    Write-Host "PASS - Total niveles: $($response.levels.Count)" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# TEST 8: Inventario
Write-Host "`n[8/8] Mi inventario..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/inventory" -Method Get -Headers $authHeaders
    Write-Host "PASS - Items: $($response.items.Count)" -ForegroundColor Green
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Resumen
Write-Host "`n=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Usuario creado: $global:Username (ID: $global:UserId)" -ForegroundColor White
Write-Host "Token: $($global:Token.Substring(0,30))..." -ForegroundColor Gray
Write-Host "`nTests completados. Servidor corriendo en http://localhost:3001`n" -ForegroundColor Green
