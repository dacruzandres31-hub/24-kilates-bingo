# TEST: SISTEMA DE PAGO A GANADORES

$BaseURL = "http://localhost:3001"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " TESTING WINNER PAYMENT SYSTEM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Crear usuario ganador
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$username = "winner_test_$timestamp"
$body = @{
    username = $username
    email = "$username@test.com"
    password = "test123"
    role = "jugador"
} | ConvertTo-Json

Write-Host "Creando usuario ganador..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$BaseURL/api/auth/register" -Method Post -Body $body -ContentType "application/json"
$token = $response.token
$userId = $response.user.id

Write-Host "Usuario creado: $username (ID: $userId)" -ForegroundColor Green
Write-Host ""

$authHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# TEST 1: Enviar informacion de pago (ganador de linea)
Write-Host "[1/6] POST /winners-payment/submit (linea)..." -ForegroundColor Yellow
$paymentInfo = @{
    gameSessionId = 1
    prizeType = "linea"
    prizeAmount = 5000
    cbu = "1234567890123456789012"
    bankAccountHolder = "Juan Perez"
    bankName = "Banco Galicia"
    accountType = "savings"
    whatsapp = "+5491123456789"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/submit" -Method Post -Headers $authHeaders -Body $paymentInfo -ErrorAction Stop
    $paymentId1 = $response.data.paymentInfoId
    Write-Host " PASS - Payment info submitted (ID: $paymentId1)" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode): $($_.ErrorDetails.Message)" -ForegroundColor Red
    $paymentId1 = $null
}

# TEST 2: Enviar informacion de pago (ganador de bingo)
Write-Host ""
Write-Host "[2/6] POST /winners-payment/submit (bingo)..." -ForegroundColor Yellow
$paymentInfo2 = @{
    gameSessionId = 1
    prizeType = "bingo"
    prizeAmount = 50000
    cbu = "1234567890123456789012"
    bankAccountHolder = "Juan Perez"
    bankName = "Banco Galicia"
    accountType = "savings"
    whatsapp = "+5491123456789"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/submit" -Method Post -Headers $authHeaders -Body $paymentInfo2 -ErrorAction Stop
    $paymentId2 = $response.data.paymentInfoId
    Write-Host " PASS - Bingo payment info submitted (ID: $paymentId2)" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode): $($_.ErrorDetails.Message)" -ForegroundColor Red
    $paymentId2 = $null
}

# TEST 3: Ver mis pagos
Write-Host ""
Write-Host "[3/6] GET /winners-payment/my-payments..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/my-payments" -Headers $authHeaders
    Write-Host " PASS - Found $($response.data.Count) payment(s)" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Login como admin
Write-Host ""
Write-Host "[4/6] Login as admin..." -ForegroundColor Yellow
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
    
    Write-Host " PASS - Admin logged in" -ForegroundColor Green
    
} catch {
    Write-Host " FAIL - Could not login as admin" -ForegroundColor Red
    $adminHeaders = $null
}

# TEST 5: Ver pagos pendientes (admin)
if ($adminHeaders) {
    Write-Host ""
    Write-Host "[5/6] GET /winners-payment/pending (admin)..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/pending" -Headers $adminHeaders
        Write-Host " PASS - Found $($response.data.Count) pending payment(s)" -ForegroundColor Green
    } catch {
        Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# TEST 6: Procesar pago (admin)
if ($adminHeaders -and $paymentId1) {
    Write-Host ""
    Write-Host "[6/6] POST /winners-payment/$paymentId1/process..." -ForegroundColor Yellow
    
    $processBody = @{
        paymentReceipt = "RECEIPT_$(Get-Date -Format 'yyyyMMddHHmmss')"
        notes = "Pago procesado via test automatizado"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseURL/api/winners-payment/$paymentId1/process" -Method Post -Headers $adminHeaders -Body $processBody -ErrorAction Stop
        Write-Host " PASS - Payment processed successfully" -ForegroundColor Green
    } catch {
        Write-Host " FAIL - $($_.Exception.Response.StatusCode): $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " TEST COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "FLUJO ESPERADO EN PRODUCCION:" -ForegroundColor Yellow
Write-Host "1. Jugador gana linea/bingo en sala monetizada" -ForegroundColor White
Write-Host "2. Sistema muestra formulario automatico" -ForegroundColor White
Write-Host "3. Jugador completa: CBU, Titular, WhatsApp" -ForegroundColor White
Write-Host "4. Admin/Cajero ve lista de pagos pendientes" -ForegroundColor White
Write-Host "5. Admin procesa pago y envia comprobante por WhatsApp" -ForegroundColor White
Write-Host "6. Jugador recibe dinero en su cuenta bancaria" -ForegroundColor White
Write-Host ""
