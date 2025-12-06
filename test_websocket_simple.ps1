# Test simplificado: WebSocket Real-Time Card Reordering

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001/api"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: WebSocket Real-Time Reordering" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    # Login como admin
    Write-Host "[1/5] Login como admin..." -NoNewline
    $loginData = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Token: $($token.Substring(0,20))..." -ForegroundColor Gray

    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    # Crear nueva sesion de prueba
    Write-Host ""
    Write-Host "[2/5] Creando nueva sesion de prueba..." -NoNewline
    
    # Primero obtener roomId de sala Bronce
    $roomsResponse = Invoke-RestMethod -Uri "$baseUrl/rooms" -Method GET -Headers $headers
    $bronzeRoom = $roomsResponse.rooms | Where-Object { $_.name -eq "Bronce" } | Select-Object -First 1
    
    if (-not $bronzeRoom) {
        throw "No se encontro sala Bronce"
    }

    $createSessionData = @{
        roomId = $bronzeRoom.id
        potBingo = 1000
        potLinea = 500
    } | ConvertTo-Json

    $createResponse = Invoke-RestMethod -Uri "$baseUrl/admin/create-session" -Method POST -Body $createSessionData -Headers $headers
    $sessionId = $createResponse.sessionId
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Session ID: $sessionId" -ForegroundColor Gray

    # Comprar cartones si no tenemos
    Write-Host "`n[3/5] Verificando cartones..." -NoNewline
    $cardsResponse = Invoke-RestMethod -Uri "$baseUrl/game/my-cards/$sessionId" -Method GET -Headers $headers
    
    $cardCount = $cardsResponse.cards.Count
    if ($cardCount -eq 0) {
        Write-Host " No hay cartones" -ForegroundColor Yellow
        Write-Host "`n[3.1/5] Comprando 3 cartones..." -NoNewline
        
        $buyCardsData = @{
            sessionId = $sessionId
            quantity = 3
        } | ConvertTo-Json

        $buyResponse = Invoke-RestMethod -Uri "$baseUrl/game/buy-cards" -Method POST -Body $buyCardsData -Headers $headers
        $cardCount = 3
        Write-Host " OK" -ForegroundColor Green
        Write-Host "  Cartones comprados: $cardCount" -ForegroundColor Gray
    } else {
        Write-Host " OK ($cardCount cartones)" -ForegroundColor Green
    }

    # Iniciar sorteo automático
    Write-Host "`n[4/5] Iniciando sorteo automático (1s interval)..." -NoNewline
    $startData = @{
        gameSessionId = $sessionId
        intervalSeconds = 1
        pauseOnWinner = $false
    } | ConvertTo-Json

    $startResponse = Invoke-RestMethod -Uri "$baseUrl/game-admin/start" -Method POST -Body $startData -Headers $headers
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Sorteo activo: $($startResponse.message)" -ForegroundColor Gray

    # Esperar que se canten varios números
    Write-Host "`n[5/5] Esperando 8 segundos (8 números cantados)..." -NoNewline
    for ($i = 8; $i -ge 1; $i--) {
        Write-Host "`rEsperando $i segundos..." -NoNewline
        Start-Sleep -Seconds 1
    }
    Write-Host "`rEspera completa         " -ForegroundColor Green

    # Verificar estado del juego
    Write-Host "`n[6/5] Verificando estado del juego..." -NoNewline
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/game-admin/status/$sessionId" -Method GET -Headers $headers
    Write-Host " OK" -ForegroundColor Green

    $ballsDrawn = $statusResponse.game.ballsDrawn.Count
    $lastBalls = $statusResponse.game.ballsDrawn | Select-Object -Last 5
    Write-Host "`n  Números cantados: $ballsDrawn" -ForegroundColor Cyan
    Write-Host "  Últimos 5: $($lastBalls -join ', ')" -ForegroundColor Gray

    # Verificar análisis de cartones (endpoint HTTP que usábamos antes)
    Write-Host "`n[7/5] Verificando análisis de cartones (HTTP)..." -NoNewline
    $analysisResponse = Invoke-RestMethod -Uri "$baseUrl/game/my-cards-analysis/$sessionId" -Method GET -Headers $headers
    Write-Host " OK" -ForegroundColor Green

    if ($analysisResponse.cards.Count -gt 0) {
        Write-Host ""
        Write-Host "  Analisis de cartones:" -ForegroundColor Cyan
        foreach ($card in ($analysisResponse.cards | Select-Object -First 3)) {
            $cardInfo = "Carton #" + $card.cardId + ": Score=" + $card.score + ", Progreso=" + $card.progress + "%, Marcados=" + $card.markedCount
            Write-Host "    $cardInfo" -ForegroundColor Gray
        }

        if ($analysisResponse.alerts.Count -gt 0) {
            Write-Host ""
            Write-Host "  Alertas activas:" -ForegroundColor Yellow
            foreach ($alert in $analysisResponse.alerts) {
                $alertText = $alert.icon + " " + $alert.message
                Write-Host "    $alertText" -ForegroundColor Yellow
            }
        }
    }

    # Detener sorteo
    Write-Host ""
    Write-Host "[8/5] Deteniendo sorteo..." -NoNewline
    $stopData = @{
        gameSessionId = $sessionId
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$baseUrl/game-admin/stop" -Method POST -Body $stopData -Headers $headers | Out-Null
    Write-Host " OK" -ForegroundColor Green

    # Instrucciones de verificacion en browser
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "TEST COMPLETADO" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Para verificar WebSocket en tiempo real:" -ForegroundColor Yellow
    Write-Host "   1. Abrir Chrome/Edge con DevTools (F12)" -ForegroundColor White
    Write-Host "   2. Ir a Console y ejecutar:" -ForegroundColor White
    Write-Host "      localStorage.debug = 'socket.io-client:*'" -ForegroundColor Gray
    Write-Host "   3. Recargar pagina" -ForegroundColor White
    $sessionUrl = "   4. Ir a GameRoom de la sesion: " + $sessionId
    Write-Host $sessionUrl -ForegroundColor White
    Write-Host "   5. Iniciar sorteo desde Admin" -ForegroundColor White
    Write-Host "   6. Buscar en Console logs tipo:" -ForegroundColor White
    Write-Host "      [StackedCards] Cards reordered (WebSocket): {...}" -ForegroundColor Cyan
    Write-Host "   7. Verificar que NO hay requests HTTP GET a:" -ForegroundColor White
    $apiUrl = "      /api/game/my-cards-analysis/" + $sessionId
    Write-Host $apiUrl -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Si ves el log y NO ves requests HTTP = FUNCIONA!" -ForegroundColor Green

    Write-Host ""
    $sessionInfo = "Session ID para testing: " + $sessionId
    Write-Host $sessionInfo -ForegroundColor Cyan
    $frontendUrl = "URL Frontend: http://localhost:3000/game/" + $sessionId
    Write-Host $frontendUrl -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host ""
    Write-Host "Detalles:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}
