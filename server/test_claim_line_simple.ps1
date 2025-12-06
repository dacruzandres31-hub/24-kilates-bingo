Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: CANTAR LÍNEA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"

# Paso 1: Setup
Write-Host "[1/3] Creando datos de prueba..." -NoNewline
$setupOutput = node setup_test_data.js 2>&1 | Out-String
if ($setupOutput -match "SUCCESS") {
    Write-Host " OK" -ForegroundColor Green
    $sessionId = [regex]::Match($setupOutput, "Session ID: (\d+)").Groups[1].Value
    $cardId = [regex]::Match($setupOutput, "Card ID: (\d+)").Groups[1].Value
    Write-Host "  Session: $sessionId, Card: $cardId" -ForegroundColor Gray
} else {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host $setupOutput
    exit 1
}

# Paso 2: Login con cualquier usuario
Write-Host "[2/3] Login..." -NoNewline
try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/auth/login" -Body $loginBody -ContentType "application/json"
    $token = $response.token
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)"
    exit 1
}

# Paso 3: Claim line
Write-Host "[3/3] POST /api/game/claim-line..." -NoNewline
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $claimBody = @{
        gameSessionId = [int]$sessionId
        cardId = [int]$cardId
        lineType = "horizontal_1"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/game/claim-line" -Headers $headers -Body $claimBody -ContentType "application/json"
    
    if ($result.success) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "`n✅ LÍNEA VÁLIDA!" -ForegroundColor Green
        Write-Host "  Premio: `$$($result.prizeAmount)" -ForegroundColor Yellow
        Write-Host "  Tipo: $($result.lineType)" -ForegroundColor Yellow
        Write-Host "  Números ganadores: $($result.winningNumbers -join ', ')" -ForegroundColor Yellow
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        Write-Host "  Mensaje: $($result.message)"
    }
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "  Exception Type: $($_.Exception.GetType().FullName)" -ForegroundColor Gray
    Write-Host "  Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    
    # Leer el cuerpo de la respuesta directamente
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Yellow
    } else {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
