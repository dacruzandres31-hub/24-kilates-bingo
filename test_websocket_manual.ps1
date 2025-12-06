# Test Manual: WebSocket Real-Time Card Reordering
# Este test usa una sesion existente

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001/api"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: WebSocket Real-Time (Manual)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Login como admin
Write-Host "[1/4] Login como admin..." -NoNewline
$loginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Token obtenido" -ForegroundColor Gray
} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "No se pudo hacer login" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Obtener salas disponibles
Write-Host ""
Write-Host "[2/4] Obteniendo salas..." -NoNewline
try {
    $roomsResponse = Invoke-RestMethod -Uri "$baseUrl/rooms" -Method GET -Headers $headers
    $rooms = $roomsResponse.rooms
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Salas encontradas: $($rooms.Count)" -ForegroundColor Gray
} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Obtener status de juegos activos
Write-Host ""
Write-Host "[3/4] Verificando juegos activos..." -NoNewline
try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/game-admin/status" -Method GET -Headers $headers
    $activeGames = $statusResponse.games | Where-Object { $_.status -eq 'active' }
    
    if ($activeGames.Count -gt 0) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "  Juegos activos: $($activeGames.Count)" -ForegroundColor Gray
        
        foreach ($game in $activeGames) {
            Write-Host ""
            Write-Host "  Sesion ID: $($game.sessionId)" -ForegroundColor Cyan
            Write-Host "  Sala: $($game.roomName)" -ForegroundColor Gray
            Write-Host "  Status: $($game.status)" -ForegroundColor Gray
            Write-Host "  Numeros cantados: $($game.ballsDrawn)" -ForegroundColor Gray
        }
        
        $sessionId = $activeGames[0].sessionId
    } else {
        Write-Host " No hay juegos activos" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Para crear un juego:" -ForegroundColor Yellow
        Write-Host "1. Ir a la web del admin" -ForegroundColor White
        Write-Host "2. Iniciar una sesion manualmente" -ForegroundColor White
        Write-Host "3. Volver a ejecutar este test" -ForegroundColor White
        exit 0
    }
} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Instrucciones de verificacion
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUCCIONES DE VERIFICACION" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para verificar que WebSocket funciona:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abrir Chrome/Edge con DevTools (F12)" -ForegroundColor White
Write-Host "2. Ir a Console y ejecutar:" -ForegroundColor White
Write-Host "   localStorage.debug = 'socket.io-client:*'" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Abrir la sala de juego:" -ForegroundColor White
Write-Host "   http://localhost:3000/game/$sessionId" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Si tienes cartones, veras en Console:" -ForegroundColor White
Write-Host "   [Socket] Conectado: <id>" -ForegroundColor Gray
Write-Host "   [Socket] Joined personal room: user_1" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Cuando se cante un numero, busca:" -ForegroundColor White
Write-Host "   [StackedCards] Ball drawn: XX" -ForegroundColor Gray
Write-Host "   [StackedCards] Cards reordered (WebSocket): {...}" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. En la tab Network, verifica que NO aparece:" -ForegroundColor White
Write-Host "   GET /api/game/my-cards-analysis/..." -ForegroundColor Gray
Write-Host ""
Write-Host "Si ves el log de 'cards_reordered' y NO ves" -ForegroundColor Green
Write-Host "el request HTTP = WebSocket funciona correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
