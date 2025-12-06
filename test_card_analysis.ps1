# Test: Endpoint de Análisis de Cartones Apilados
# GET /api/game/my-cards-analysis/:gameSessionId

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3001/api"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: Analisis de Cartones Apilados" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    # Paso 1: Login (obtener token)
    Write-Host "[1/3] Login de usuario..." -NoNewline
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"

    $token = $loginResponse.token
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Token obtenido: $($token.Substring(0, 20))..." -ForegroundColor Gray

    # Paso 2: Obtener estado del juego activo
    Write-Host "`n[2/3] GET /api/game-admin/status..." -NoNewline
    $headers = @{
        Authorization = "Bearer $token"
    }

    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/game-admin/status" `
        -Method GET `
        -Headers $headers

    if ($statusResponse.totalGames -eq 0) {
        Write-Host " NO HAY JUEGOS ACTIVOS" -ForegroundColor Yellow
        Write-Host "`nNecesitas iniciar un juego primero con test_auto_game.ps1" -ForegroundColor Yellow
        exit 0
    }

    Write-Host " OK" -ForegroundColor Green
    $activeGame = $statusResponse.activeGames[0]
    $gameSessionId = $activeGame.sessionId
    Write-Host "  Session ID: $gameSessionId" -ForegroundColor Gray
    Write-Host "  Sala: $($activeGame.roomId)" -ForegroundColor Gray
    Write-Host "  Numeros cantados: $($activeGame.ballsDrawn)" -ForegroundColor Gray

    # Paso 3: Obtener análisis de cartones
    Write-Host "`n[3/3] GET /api/game/my-cards-analysis/$gameSessionId..." -NoNewline
    $analysisResponse = Invoke-RestMethod -Uri "$baseUrl/game/my-cards-analysis/$gameSessionId" `
        -Method GET `
        -Headers $headers

    Write-Host " OK" -ForegroundColor Green

    # Mostrar resultados
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "ANALISIS DE CARTONES" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    Write-Host "`nRESUMEN:" -ForegroundColor Yellow
    Write-Host "  Total de cartones: $($analysisResponse.meta.totalCards)" -ForegroundColor White
    Write-Host "  Numeros cantados: $($analysisResponse.meta.ballsDrawn)" -ForegroundColor White
    Write-Host "  Ultimo numero: $($analysisResponse.meta.lastBall)" -ForegroundColor White
    Write-Host "  Progreso promedio: $($analysisResponse.summary.averageProgress)%" -ForegroundColor White
    Write-Host "  Total marcados: $($analysisResponse.summary.totalMarked)" -ForegroundColor White

    # Alertas
    if ($analysisResponse.alerts.Count -gt 0) {
        Write-Host "`nALERTAS:" -ForegroundColor Yellow
        foreach ($alert in $analysisResponse.alerts) {
            $color = switch ($alert.type) {
                "super-critical" { "Magenta" }
                "critical" { "Red" }
                "warning" { "Yellow" }
                "info" { "Cyan" }
                "success" { "Green" }
                default { "White" }
            }
            Write-Host "  $($alert.icon) $($alert.message)" -ForegroundColor $color
        }
    } else {
        Write-Host "`nNo hay alertas criticas" -ForegroundColor Gray
    }

    # Top 5 cartones
    Write-Host "`nTOP 5 CARTONES (Ordenados por progreso):" -ForegroundColor Yellow
    $topCards = $analysisResponse.cards | Select-Object -First 5
    foreach ($card in $topCards) {
        $isTop = if ($card.viewConfig.isTop) { " [MEJOR]" } else { "" }
        Write-Host "`n  Carton #$($card.cardId)$isTop" -ForegroundColor Cyan
        Write-Host "    Progreso: $($card.progress)%" -ForegroundColor White
        Write-Host "    Marcados: $($card.markedCount)/25" -ForegroundColor White
        Write-Host "    Score: $($card.score)" -ForegroundColor White
        Write-Host "    z-index: $($card.viewConfig.zIndex)" -ForegroundColor Gray
        Write-Host "    Offset Y: $($card.viewConfig.offsetY)px" -ForegroundColor Gray
        Write-Host "    Opacidad: $($card.viewConfig.opacity)" -ForegroundColor Gray

        # Líneas casi completas
        $almostLines = $card.lineAnalysis | Where-Object { $_.almostComplete -and !$_.isComplete }
        if ($almostLines.Count -gt 0) {
            Write-Host "    Lineas cercanas:" -ForegroundColor Yellow
            foreach ($line in ($almostLines | Select-Object -First 2)) {
                Write-Host "      - $($line.name): Faltan $($line.missing) ($($line.missingNumbers -join ', '))" -ForegroundColor White
            }
        }
    }

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "TEST COMPLETADO EXITOSAMENTE" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan

} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "`nDetalles del error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}
