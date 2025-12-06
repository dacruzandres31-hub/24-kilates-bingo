# ============================================
# TEST: DATOS DE PAGO DE GANADORES
# ============================================

$BaseURL = "http://localhost:3001"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TESTING WINNERS PAYMENT INFO SYSTEM" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Crear usuario ganador para pruebas
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$username = "winner_test_$timestamp"
$body = @{
    username = $username
    email = "$username@test.com"
    password = "test123"
    role = "jugador"
} | ConvertTo-Json

Write-Host "Creando usuario ganador de prueba..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$BaseURL/api/auth/register" -Method Post -Body $body -ContentType "application/json"
$token = $response.token
$userId = $response.user.id

Write-Host "Usuario creado: $username (ID: $userId)`n" -ForegroundColor Green

$authHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# TEST 1: Enviar datos bancarios completos (simulando que ganó)
Write-Host "[1/7] POST /winners-payment/submit..." -ForegroundColor Yellow
$paymentData = @{
    gameSessionId = 1
    prizeType = "linea"
    prizeAmount = 5000
    salaType = "oro"
    bankAccountHolder = "Juan Pérez"
    cbu = "1234567890123456789012"
    bankName = "Banco Nación"
    accountType = "savings"
    whatsappNumber = "+54 9 11 1234-5678"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/submit" -Method Post -Headers $authHeaders -Body $paymentData -ErrorAction Stop
    $paymentInfoId = $response.data.paymentInfoId
    Write-Host " PASS - Payment info submitted (ID: $paymentInfoId)" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode): $($_.ErrorDetails.Message)" -ForegroundColor Red
    $paymentInfoId = $null
}

# TEST 2: Intentar enviar CBU inválido (debe fallar)
Write-Host "`n[2/7] POST /winners-payment/submit (CBU inválido)..." -ForegroundColor Yellow
$invalidPayment = @{
    gameSessionId = 1
    prizeType = "bingo"
    prizeAmount = 10000
    salaType = "oro"
    bankAccountHolder = "Juan Pérez"
    cbu = "12345"
    bankName = "Banco Nación"
    accountType = "savings"
    whatsappNumber = "+54 9 11 1234-5678"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/submit" -Method Post -Headers $authHeaders -Body $invalidPayment -ErrorAction Stop
    Write-Host " UNEXPECTED PASS - Should reject invalid CBU" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400 -and $_.ErrorDetails.Message -like "*CBU inválido*") {
        Write-Host " PASS - Correctly rejected (invalid CBU)" -ForegroundColor Green
    } else {
        Write-Host " FAIL - Wrong error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# TEST 3: Intentar sala no monetizada (debe fallar)
Write-Host "`n[3/7] POST /winners-payment/submit (sala free)..." -ForegroundColor Yellow
$freePayment = @{
    gameSessionId = 1
    prizeType = "linea"
    prizeAmount = 1000
    salaType = "free"
    bankAccountHolder = "Juan Pérez"
    cbu = "1234567890123456789012"
    bankName = "Banco Nación"
    accountType = "savings"
    whatsappNumber = "+54 9 11 1234-5678"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/submit" -Method Post -Headers $authHeaders -Body $freePayment -ErrorAction Stop
    Write-Host " UNEXPECTED PASS - Should reject free sala" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host " PASS - Correctly rejected (free sala not allowed)" -ForegroundColor Green
    } else {
        Write-Host " FAIL - Wrong error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# TEST 4: Ver mis pagos pendientes
Write-Host "`n[4/7] GET /winners-payment/my-pending..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/my-pending" -Headers $authHeaders
    Write-Host " PASS - Found $($response.total) pending payment(s)" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# TEST 5: Ver mi historial
Write-Host "`n[5/7] GET /winners-payment/my-history..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/my-history" -Headers $authHeaders
    Write-Host " PASS - Found $($response.total) payment(s) in history" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# TEST 6: Admin - Ver todos los pagos pendientes
Write-Host "`n[6/7] GET /winners-payment/pending (as admin)..." -ForegroundColor Yellow
$adminBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $adminResponse = Invoke-RestMethod -Uri "$BaseURL/api/auth/login" -Method Post -Body $adminBody -ContentType "application/json"
    $adminToken = $adminResponse.token
    
    $adminHeaders = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/pending" -Headers $adminHeaders
    Write-Host " PASS - Found $($response.total) pending payment(s) for admin" -ForegroundColor Green
    
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# TEST 7: Admin - Procesar pago
if ($paymentInfoId) {
    Write-Host "`n[7/7] POST /winners-payment/$paymentInfoId/process (as admin)..." -ForegroundColor Yellow
    
    $processBody = @{
        paymentReceipt = "COMPROBANTE_TEST_123456"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/$paymentInfoId/process" -Method Post -Headers $adminHeaders -Body $processBody -ErrorAction Stop
        Write-Host " PASS - Payment processed successfully" -ForegroundColor Green
    } catch {
        Write-Host " FAIL - $($_.Exception.Response.StatusCode): $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# TEST BONUS: Estadísticas
Write-Host "`n[BONUS] GET /winners-payment/stats (as admin)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/stats" -Headers $adminHeaders
    Write-Host " PASS - Stats retrieved" -ForegroundColor Green
    Write-Host "   Pending payments: $($response.data.pending.count) ($($response.data.pending.amount) chips)" -ForegroundColor Cyan
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TEST COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
