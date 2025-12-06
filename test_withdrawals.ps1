# ============================================
# TEST: SISTEMA DE RETIROS (WITHDRAWALS)
# ============================================

$BaseURL = "http://localhost:3001"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TESTING WITHDRAWAL SYSTEM" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Crear usuario para pruebas
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$username = "withdraw_test_$timestamp"
$body = @{
    username = $username
    email = "$username@test.com"
    password = "test123"
    role = "jugador"
} | ConvertTo-Json

Write-Host "Creando usuario de prueba..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$BaseURL/api/auth/register" -Method Post -Body $body -ContentType "application/json"
$token = $response.token
$userId = $response.user.id

Write-Host "Usuario creado: $username (ID: $userId)" -ForegroundColor Green
Write-Host "Balance inicial: $($response.user.balance)`n"

$authHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# TEST 1: Solicitar retiro SIN fondos (debe fallar)
Write-Host "[1/8] POST /withdrawals/request (sin fondos)..." -ForegroundColor Yellow
$withdrawalBody = @{
    amount = 500
    bankAccountHolder = "Test User"
    cbu = "1234567890123456789012"
    bankName = "Banco Test"
    accountType = "savings"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/withdrawals/request" -Method Post -Headers $authHeaders -Body $withdrawalBody -ErrorAction Stop
    Write-Host " UNEXPECTED PASS - Should fail with insufficient balance" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 500 -and $_.ErrorDetails.Message -like "*insuficientes*") {
        Write-Host " PASS - Correctly rejected (insufficient balance)" -ForegroundColor Green
    } else {
        Write-Host " FAIL - Wrong error: $($_.Exception.Response.StatusCode) - $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Dar fondos al usuario (admin deposit)
Write-Host "`n[2/8] Depositar fondos al usuario..." -ForegroundColor Yellow
$adminBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $adminResponse = Invoke-RestMethod -Uri "$BaseURL/api/auth/login" -Method Post -Body $adminBody -ContentType "application/json"
    $adminToken = $adminResponse.token
    
    $depositBody = @{
        userId = $userId
        amount = 1000
        reason = "Test deposit"
    } | ConvertTo-Json
    
    $adminHeaders = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$BaseURL/api/chips/deposit" -Method Post -Headers $adminHeaders -Body $depositBody
    Write-Host " PASS - Deposited 1000 chips" -ForegroundColor Green
    
} catch {
    Write-Host " FAIL - Could not deposit: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 3: Solicitar retiro CON fondos (debe funcionar)
Write-Host "`n[3/8] POST /withdrawals/request (con fondos)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/withdrawals/request" -Method Post -Headers $authHeaders -Body $withdrawalBody -ErrorAction Stop
    $withdrawalId = $response.data.withdrawalRequestId
    Write-Host " PASS - Withdrawal request created (ID: $withdrawalId)" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode): $($_.ErrorDetails.Message)" -ForegroundColor Red
    $withdrawalId = $null
}

# TEST 4: Ver solicitudes pendientes propias
Write-Host "`n[4/8] GET /withdrawals/pending..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/withdrawals/pending" -Headers $authHeaders
    Write-Host " PASS - Found $($response.data.Count) pending withdrawal(s)" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# TEST 5: Ver historial de retiros
Write-Host "`n[5/8] GET /withdrawals/history..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/withdrawals/history" -Headers $authHeaders
    Write-Host " PASS - Found $($response.data.Count) withdrawal(s) in history" -ForegroundColor Green
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# TEST 6: Verificar permisos (como cajero)
if ($withdrawalId) {
    Write-Host "`n[6/8] GET /withdrawals/$withdrawalId/check-permissions (as cashier)..." -ForegroundColor Yellow
    
    # Login como cajero
    $cajeroBody = @{
        username = "cashier"
        password = "cashier123"
    } | ConvertTo-Json
    
    try {
        $cajeroResponse = Invoke-RestMethod -Uri "$BaseURL/api/auth/login" -Method Post -Body $cajeroBody -ContentType "application/json" -ErrorAction SilentlyContinue
        $cajeroToken = $cajeroResponse.token
        
        $cajeroHeaders = @{
            "Authorization" = "Bearer $cajeroToken"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$BaseURL/api/withdrawals/$withdrawalId/check-permissions" -Headers $cajeroHeaders
        $canProcess = $response.data.canProcess
        $minutes = $response.data.minutesSinceCredit
        
        Write-Host " PASS - Can process: $canProcess, Minutes since credit: $minutes" -ForegroundColor Green
        
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) {
            Write-Host " SKIP - Cashier user not available" -ForegroundColor Yellow
        } else {
            Write-Host " FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
}

# TEST 7: Procesar retiro (como admin)
if ($withdrawalId) {
    Write-Host "`n[7/8] POST /withdrawals/$withdrawalId/process (as admin)..." -ForegroundColor Yellow
    
    $processBody = @{
        transferReceipt = "TEST_RECEIPT_123"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseURL/api/withdrawals/$withdrawalId/process" -Method Post -Headers $adminHeaders -Body $processBody -ErrorAction Stop
        Write-Host " PASS - Withdrawal processed successfully" -ForegroundColor Green
    } catch {
        Write-Host " FAIL - $($_.Exception.Response.StatusCode): $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# TEST 8: Crear y rechazar otro retiro
Write-Host "`n[8/8] POST /withdrawals/request + reject..." -ForegroundColor Yellow
try {
    # Crear nueva solicitud
    $withdrawalBody2 = @{
        amount = 200
        bankAccountHolder = "Test User"
        cbu = "1234567890123456789012"
        bankName = "Banco Test"
        accountType = "savings"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BaseURL/api/withdrawals/request" -Method Post -Headers $authHeaders -Body $withdrawalBody2
    $withdrawalId2 = $response.data.withdrawalRequestId
    
    # Rechazar solicitud
    $rejectBody = @{
        rejectionReason = "Test rejection"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BaseURL/api/withdrawals/$withdrawalId2/reject" -Method Post -Headers $adminHeaders -Body $rejectBody
    Write-Host " PASS - Created and rejected withdrawal" -ForegroundColor Green
    
} catch {
    Write-Host " FAIL - $($_.Exception.Response.StatusCode): $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TEST COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
