Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: SORTEO AUTOMÃTICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"

# Paso 1: Setup datos
Write-Host "[1/5] Creando sesiÃ³n de juego..." -NoNewline
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

# Paso 2: Login admin
Write-Host "[2/5] Login admin..." -NoNewline
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
    exit 1
}

# Paso 3: Iniciar sorteo automÃ¡tico
Write-Host "[3/5] POST /api/game-admin/start..." -NoNewline
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $startBody = @{
        gameSessionId = [int]$sessionId
        drawInterval = 2000
        pauseOnWinner = 1000
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/game-admin/start" -Headers $headers -Body $startBody -ContentType "application/json"
    
    if ($result.success) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "  Sorteo iniciado - Sala: $($result.roomId)" -ForegroundColor Yellow
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

# Paso 4: Esperar 10 segundos
Write-Host "[4/5] Esperando 10 segundos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Paso 5: Obtener estado
Write-Host "[5/5] GET /api/game-admin/status..." -NoNewline
try {
    $status = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/game-admin/status" -Headers $headers
    
    if ($status.success) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host ""
        Write-Host "ESTADO DE JUEGOS:" -ForegroundColor Cyan
        Write-Host "  Total juegos: $($status.totalGames)" -ForegroundColor Yellow
        
        foreach ($game in $status.activeGames) {
            Write-Host ""
            Write-Host "  Sesion $($game.sessionId):" -ForegroundColor White
            Write-Host "     Sala: $($game.roomId)" -ForegroundColor Gray
            Write-Host "     Numeros cantados: $($game.ballsDrawn)" -ForegroundColor Gray
            Write-Host "     Numeros disponibles: $($game.availableBalls)" -ForegroundColor Gray
            Write-Host "     Pausado: $($game.isPaused)" -ForegroundColor Gray
            Write-Host "     Ganadores de linea: $($game.lineWinners)" -ForegroundColor Gray
            
            if ($game.bingoWinner) {
                Write-Host "     BINGO WINNER: $($game.bingoWinner.username)" -ForegroundColor Green
            }
        }
    }
} catch {
    Write-Host " FAIL" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SORTEO CONTINÃA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NÃºmeros cada 2 segundos" -ForegroundColor Yellow
Write-Host "  ValidaciÃ³n automÃ¡tica" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Para detener:" -ForegroundColor Gray
Write-Host "  POST /api/game-admin/stop" -ForegroundColor Gray
Write-Host "  Body: { gameSessionId: $sessionId }" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
