# Test WebSocket: Solo verificar estado actual

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001/api"

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "TEST: WebSocket Real-Time" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "[1/2] Login..." -NoNewline
$loginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " ERROR" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Verificar status
Write-Host ""
Write-Host "[2/2] Status de juegos..." -NoNewline
try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/game-admin/status" -Method GET -Headers $headers
    Write-Host " OK" -ForegroundColor Green
    
    if ($statusResponse.games -and $statusResponse.games.Count -gt 0) {
        Write-Host ""
        Write-Host "Juegos encontrados:" -ForegroundColor Cyan
        
        foreach ($game in $statusResponse.games) {
            Write-Host ""
            Write-Host "  Session: $($game.sessionId)" -ForegroundColor Cyan
            Write-Host "  Sala: $($game.roomName)" -ForegroundColor Gray
            Write-Host "  Estado: $($game.status)" -ForegroundColor Gray
            Write-Host "  Numeros: $($game.ballsDrawn)" -ForegroundColor Gray
        }
        
        $sessionId = $statusResponse.games[0].sessionId
        
        Write-Host ""
        Write-Host "====================================" -ForegroundColor Cyan
        Write-Host "VERIFICACION EN BROWSER" -ForegroundColor Green
        Write-Host "====================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Abrir Chrome DevTools (F12)" -ForegroundColor White
        Write-Host ""
        Write-Host "2. Console > ejecutar:" -ForegroundColor White
        Write-Host "   localStorage.debug = 'socket.io-client:*'" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Ir a:" -ForegroundColor White
        Write-Host "   http://localhost:3000/game/$sessionId" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "4. Buscar en Console:" -ForegroundColor White
        Write-Host "   [Socket] Joined personal room" -ForegroundColor Gray
        Write-Host "   [StackedCards] Cards reordered (WebSocket)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "5. Network > NO debe haber:" -ForegroundColor White
        Write-Host "   GET /my-cards-analysis" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Si ves el log WebSocket = FUNCIONA!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "No hay juegos activos" -ForegroundColor Yellow
        Write-Host "Crea uno desde el admin y vuelve a ejecutar" -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
