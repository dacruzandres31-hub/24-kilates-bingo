# Test de Endpoints de Chips
# Verifica balance, deposit, withdraw, movements

$BaseURL = "http://localhost:3001"
$Headers = @{"Content-Type" = "application/json"}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TESTING CHIPS ENDPOINTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Crear usuario de prueba
$timestamp = Get-Date -Format "HHmmss"
$registerBody = @{
    username = "chiptest_$timestamp"
    password = "Test123!"
    role = "jugador"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BaseURL/api/auth/register" -Method Post -Headers $Headers -Body $registerBody
$token = $response.token
$userId = $response.user.id
$username = $response.user.username

Write-Host "Usuario creado: $username (ID: $userId)" -ForegroundColor Green
Write-Host "Balance inicial: $($response.user.balance)`n" -ForegroundColor Gray

$authHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# TEST 1: Get Balance
Write-Host "[1/6] GET Balance..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/chips/balance" -Headers $authHeaders
    Write-Host " PASS - Balance: $($response.balance)" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# TEST 2: Get Balance by ID
Write-Host "`n[2/6] GET Balance by ID..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/chips/balance/$userId" -Headers $authHeaders
    Write-Host " PASS - Balance: $($response.balance)" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# TEST 3: Get History
Write-Host "`n[3/6] GET History..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/chips/history" -Headers $authHeaders
    Write-Host " PASS - Movimientos: $($response.movements.Count)" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# TEST 4: Get Stats
Write-Host "`n[4/6] GET Stats..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/chips/stats" -Headers $authHeaders
    Write-Host " PASS - Stats obtenidas" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# TEST 5: Deposit (should fail - requires admin)
Write-Host "`n[5/6] POST Deposit (should fail for player)..." -ForegroundColor Yellow
$depositBody = @{
    userId = $userId
    amount = 1000
    reason = "Test deposit"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/chips/deposit" -Method Post -Headers $authHeaders -Body $depositBody -ErrorAction Stop
    Write-Host " UNEXPECTED PASS - Deposit should require admin role" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host " PASS - Correctly denied (403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host " FAIL - Wrong error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# TEST 6: Transfer (if implemented)
Write-Host "`n[6/6] POST Transfer..." -ForegroundColor Yellow
$transferBody = @{
    toUserId = 1
    amount = 10
    description = "Test transfer"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/chips/transfer" -Method Post -Headers $authHeaders -Body $transferBody -ErrorAction Stop
    Write-Host " PASS - Transfer: $($response.success)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host " EXPECTED FAIL - Insufficient balance" -ForegroundColor Yellow
    } else {
        Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TEST COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
