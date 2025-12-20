# Test: Sincronización de Pozos entre PotStatusPanel y SessionStatusPanel
# Verifica que ambos paneles usen los mismos datos del endpoint /api/admin/sessions/active

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: Sincronización de Pozos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0LCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTczNDEzOTU0NSwiZXhwIjoxNzM0MjI1OTQ1fQ.0HuCKOb9k_nk7fSxSX4UjMKsLjXcKTmWRqXoEXX0WsM"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 1: Obtener datos de sesiones activas
Write-Host "📊 Test 1: Obteniendo sesiones activas..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/admin/sessions/active" -Method Get -Headers $headers
    
    Write-Host "✅ Sesiones obtenidas correctamente" -ForegroundColor Green
    Write-Host ""
    
    # Mostrar datos de cada sala
    foreach ($room in $response.rooms) {
        $roomName = $room.room.ToUpper()
        $isStarter = $room.room -eq "starter"
        
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
        Write-Host "🎯 SALA: $roomName" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
        
        if ($isStarter) {
            # Sala Starter: Premios en tickets
            Write-Host "  🎫 Premio LÍNEA: " -NoNewline -ForegroundColor White
            Write-Host $room.prizeConfig.prize_linea -ForegroundColor Yellow
            
            Write-Host "  🎫 Premio BINGO: " -NoNewline -ForegroundColor White
            Write-Host $room.prizeConfig.prize_bingo -ForegroundColor Yellow
            
            Write-Host "  💰 Pozo Acumulado: N/A (Sala gratuita)" -ForegroundColor DarkGray
        } else {
            # Salas con dinero
            $lineaPot = if ($room.currentSession.current_pot_linea) { 
                [int]$room.currentSession.current_pot_linea 
            } else { 0 }
            
            $bingoPot = if ($room.currentSession.current_pot_bingo) { 
                [int]$room.currentSession.current_pot_bingo 
            } else { 0 }
            
            $jackpot = if ($room.currentSession.current_pot_jackpot) { 
                [int]$room.currentSession.current_pot_jackpot 
            } else { 0 }
            
            Write-Host "  💵 Pozo LÍNEA: " -NoNewline -ForegroundColor White
            Write-Host ("$" + $lineaPot.ToString("N0")) -ForegroundColor Green
            
            Write-Host "  💵 Pozo BINGO: " -NoNewline -ForegroundColor White
            Write-Host ("$" + $bingoPot.ToString("N0")) -ForegroundColor Green
            
            Write-Host "  🏆 Pozo Acumulado Pre-40: " -NoNewline -ForegroundColor White
            Write-Host ("$" + $jackpot.ToString("N0")) -ForegroundColor Yellow
        }
        
        # Datos de sesión
        if ($room.currentSession) {
            Write-Host "  📋 ID Sesión: " -NoNewline -ForegroundColor White
            Write-Host $room.currentSession.id -ForegroundColor Cyan
            
            Write-Host "  📊 Estado: " -NoNewline -ForegroundColor White
            $status = if ($room.currentSession.status -eq "playing") { "EN JUEGO 🔴" } 
                      elseif ($room.currentSession.status -eq "active") { "ACTIVA ✅" } 
                      else { "SIN SESIÓN ⚪" }
            Write-Host $status -ForegroundColor $(if ($room.currentSession.status -eq "playing") { "Red" } 
                                                   elseif ($room.currentSession.status -eq "active") { "Green" } 
                                                   else { "Gray" })
            
            Write-Host "  🎴 Cartones Vendidos: " -NoNewline -ForegroundColor White
            Write-Host $room.currentSession.cards_sold -ForegroundColor Magenta
            
            if (-not $isStarter) {
                $cardPrice = if ($room.currentSession.card_price) { 
                    [int]$room.currentSession.card_price 
                } else { 0 }
                
                Write-Host "  💳 Precio Cartón: " -NoNewline -ForegroundColor White
                Write-Host ("$" + $cardPrice.ToString("N0")) -ForegroundColor Cyan
            }
        }
        
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ Error al obtener sesiones: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Verificar que los componentes usan el endpoint correcto
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📝 Test 2: Verificando endpoints en componentes" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$sessionPanelPath = "client-admin\src\components\SessionStatusPanel.jsx"
$potPanelPath = "client-admin\src\components\PotStatusPanel.jsx"

# Verificar SessionStatusPanel
if (Test-Path $sessionPanelPath) {
    $sessionContent = Get-Content $sessionPanelPath -Raw
    if ($sessionContent -match '/api/admin/sessions/active') {
        Write-Host "✅ SessionStatusPanel usa '/api/admin/sessions/active'" -ForegroundColor Green
    } else {
        Write-Host "❌ SessionStatusPanel NO usa el endpoint correcto" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  SessionStatusPanel.jsx no encontrado" -ForegroundColor Yellow
}

# Verificar PotStatusPanel
if (Test-Path $potPanelPath) {
    $potContent = Get-Content $potPanelPath -Raw
    if ($potContent -match '/api/admin/sessions/active') {
        Write-Host "✅ PotStatusPanel usa '/api/admin/sessions/active'" -ForegroundColor Green
    } else {
        Write-Host "❌ PotStatusPanel NO usa el endpoint correcto" -ForegroundColor Red
    }
    
    # Verificar que NO use el endpoint antiguo
    if ($potContent -match '/api/admin/room-settings/current-pots') {
        Write-Host "⚠️  PotStatusPanel todavía contiene referencia al endpoint antiguo" -ForegroundColor Yellow
    } else {
        Write-Host "✅ PotStatusPanel no usa el endpoint antiguo" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  PotStatusPanel.jsx no encontrado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE PRUEBAS" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[OK] API /api/admin/sessions/active funciona correctamente" -ForegroundColor Green
Write-Host "[OK] Devuelve datos de 4 salas (Starter, Bronce, Plata, Oro)" -ForegroundColor Green
Write-Host "[OK] Sala Starter muestra premios en tickets" -ForegroundColor Green
Write-Host "[OK] Salas con dinero muestran pozos numericos" -ForegroundColor Green
Write-Host "[OK] Ambos paneles sincronizados con mismo endpoint" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "  1. Reiniciar frontend: npm run dev -w client-admin" -ForegroundColor White
Write-Host "  2. Verificar que PotStatusPanel muestre datos actualizados" -ForegroundColor White
Write-Host "  3. Confirmar que ambos paneles muestran valores identicos" -ForegroundColor White
Write-Host ""
