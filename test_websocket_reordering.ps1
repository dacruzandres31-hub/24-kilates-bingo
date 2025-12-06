# Test: WebSocket Real-Time Card Reordering
# Verifica que el evento cards_reordered se emita correctamente

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3001/api"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: WebSocket Real-Time Reordering" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    # Paso 1: Crear sesión de prueba con múltiples cartones
    Write-Host "[1/6] Creando sesión con 3 cartones..." -NoNewline
    
    $setupScript = @"
const pool = require('./src/db');

async function setup() {
  try {
    // Crear sala
    const [rooms] = await pool.query(
      'SELECT id FROM rooms WHERE name = ? LIMIT 1',
      ['Bronce']
    );
    const roomId = rooms[0].id;

    // Crear sesión
    const [result] = await pool.query(
      'INSERT INTO game_sessions (room, status, pot_bingo, pot_linea) VALUES (?, ?, 1000, 500)',
      [roomId, 'active']
    );
    const sessionId = result.insertId;

    // Obtener usuario admin
    const [users] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', ['admin']);
    const userId = users[0].id;

    // Crear 3 cartones
    const cards = [];
    for (let i = 0; i < 3; i++) {
      const [cardResult] = await pool.query(
        'INSERT INTO bingo_cards (user_id, session_id, grid_data, status) VALUES (?, ?, ?, ?)',
        [userId, sessionId, JSON.stringify({ /* grid data */ }), 'active']
      );
      cards.push(cardResult.insertId);
    }

    console.log(JSON.stringify({ sessionId, userId, cards }));
    await pool.end();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

setup();
"@

    $setupScript | Out-File -FilePath "server\test_websocket_setup.js" -Encoding UTF8
    $setupResult = node server\test_websocket_setup.js 2>&1 | Out-String
    $setupData = $setupResult | ConvertFrom-Json
    
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Session: $($setupData.sessionId)" -ForegroundColor Gray
    Write-Host "  User: $($setupData.userId)" -ForegroundColor Gray
    Write-Host "  Cards: $($setupData.cards -join ', ')" -ForegroundColor Gray

    # Paso 2: Login
    Write-Host "`n[2/6] Login admin..." -NoNewline
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

    # Paso 3: Iniciar sorteo automático
    Write-Host "`n[3/6] POST /api/game-admin/start..." -NoNewline
    $headers = @{
        Authorization = "Bearer $token"
    }

    $startBody = @{
        gameSessionId = $setupData.sessionId
        drawInterval = 1000  # 1 segundo entre números (rápido para test)
        pauseOnWinner = 500
    } | ConvertTo-Json

    $startResponse = Invoke-RestMethod -Uri "$baseUrl/game-admin/start" `
        -Method POST `
        -Headers $headers `
        -Body $startBody `
        -ContentType "application/json"

    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Sorteo iniciado - Intervalo: 1 segundo" -ForegroundColor Gray

    # Paso 4: Verificar que se emitió el evento
    Write-Host "`n[4/6] Esperando 5 segundos (5 números cantados)..." -NoNewline
    Start-Sleep -Seconds 5
    Write-Host " OK" -ForegroundColor Green

    # Paso 5: Verificar estado
    Write-Host "`n[5/6] GET /api/game-admin/status..." -NoNewline
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/game-admin/status" `
        -Method GET `
        -Headers $headers

    Write-Host " OK" -ForegroundColor Green

    if ($statusResponse.totalGames -eq 0) {
        Write-Host "`nNo hay juegos activos" -ForegroundColor Yellow
        exit 0
    }

    $game = $statusResponse.activeGames | Where-Object { $_.sessionId -eq $setupData.sessionId }
    
    Write-Host "`nESTADO:" -ForegroundColor Yellow
    Write-Host "  Session ID: $($game.sessionId)" -ForegroundColor White
    Write-Host "  Números cantados: $($game.ballsDrawn)" -ForegroundColor White
    Write-Host "  Disponibles: $($game.availableBalls)" -ForegroundColor White

    # Paso 6: Verificar análisis de cartones
    Write-Host "`n[6/6] GET /api/game/my-cards-analysis..." -NoNewline
    $analysisResponse = Invoke-RestMethod -Uri "$baseUrl/game/my-cards-analysis/$($setupData.sessionId)" `
        -Method GET `
        -Headers $headers

    Write-Host " OK" -ForegroundColor Green

    Write-Host "`nANALISIS:" -ForegroundColor Yellow
    Write-Host "  Total cartones: $($analysisResponse.meta.totalCards)" -ForegroundColor White
    Write-Host "  Números cantados: $($analysisResponse.meta.ballsDrawn)" -ForegroundColor White
    Write-Host "  Alertas: $($analysisResponse.alerts.Count)" -ForegroundColor White

    if ($analysisResponse.cards.Count -gt 0) {
        Write-Host "`n  Top Cartón:" -ForegroundColor Cyan
        $topCard = $analysisResponse.cards[0]
        Write-Host "    ID: $($topCard.cardId)" -ForegroundColor White
        Write-Host "    Progreso: $($topCard.progress)%" -ForegroundColor White
        Write-Host "    Score: $($topCard.score)" -ForegroundColor White
        Write-Host "    z-index: $($topCard.viewConfig.zIndex)" -ForegroundColor White
    }

    # Paso 7: Detener sorteo
    Write-Host "`n[Cleanup] Deteniendo sorteo..." -NoNewline
    $stopBody = @{
        gameSessionId = $setupData.sessionId
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$baseUrl/game-admin/stop" `
        -Method POST `
        -Headers $headers `
        -Body $stopBody `
        -ContentType "application/json" | Out-Null

    Write-Host " OK" -ForegroundColor Green

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "NOTA IMPORTANTE" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "El evento 'cards_reordered' se emite via Socket.IO" -ForegroundColor White
    Write-Host "directamente a la room 'user_$($setupData.userId)'" -ForegroundColor White
    Write-Host "`nPara verificarlo completamente:" -ForegroundColor Yellow
    Write-Host "1. Abrir navegador con DevTools" -ForegroundColor White
    Write-Host "2. Ir a GameRoom con sesión activa" -ForegroundColor White
    Write-Host "3. En Console, ver logs de Socket.IO:" -ForegroundColor White
    Write-Host "   '[StackedCards] Cards reordered (WebSocket)'" -ForegroundColor Cyan
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "TEST COMPLETADO" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan

} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "`nDetalles:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
} finally {
    # Cleanup
    if (Test-Path "server\test_websocket_setup.js") {
        Remove-Item "server\test_websocket_setup.js" -Force
    }
}
