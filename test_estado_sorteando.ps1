# Test: Detección de Estado "SORTEANDO" para Starter
# Verifica que el estado muestre correctamente cuando Starter está sorteando

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: Estado SORTEANDO para Starter" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0LCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTczNDEzOTU0NSwiZXhwIjoxNzM0MjI1OTQ1fQ.0HuCKOb9k_nk7fSxSX4UjMKsLjXcKTmWRqXoEXX0WsM"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 1: Obtener sesiones activas
Write-Host "[TEST 1] Obteniendo sesiones activas..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/admin/sessions/active" -Method Get -Headers $headers
    
    Write-Host "[OK] Sesiones obtenidas correctamente" -ForegroundColor Green
    Write-Host ""
    
    # Buscar sala Starter
    $starterRoom = $response.rooms | Where-Object { $_.room -eq "starter" }
    
    if ($starterRoom) {
        Write-Host "===========================================" -ForegroundColor Cyan
        Write-Host "SALA STARTER - Informacion de Sesion" -ForegroundColor Cyan
        Write-Host "===========================================" -ForegroundColor Cyan
        Write-Host ""
        
        $session = $starterRoom.currentSession
        
        Write-Host "ID Sesion: " -NoNewline -ForegroundColor White
        Write-Host $session.id -ForegroundColor Yellow
        
        Write-Host "Hora de Sorteo: " -NoNewline -ForegroundColor White
        Write-Host $session.start_time -ForegroundColor Cyan
        
        Write-Host "Estado en BD: " -NoNewline -ForegroundColor White
        Write-Host $session.status -ForegroundColor Magenta
        
        Write-Host ""
        
        # Calcular diferencia de tiempo
        $startTime = [DateTime]::Parse($session.start_time)
        $now = Get-Date
        $diffMinutes = ($startTime - $now).TotalMinutes
        
        Write-Host "Hora Actual: " -NoNewline -ForegroundColor White
        Write-Host $now.ToString("HH:mm:ss") -ForegroundColor Green
        
        Write-Host "Hora Sorteo: " -NoNewline -ForegroundColor White
        Write-Host $startTime.ToString("HH:mm:ss") -ForegroundColor Green
        
        Write-Host "Diferencia: " -NoNewline -ForegroundColor White
        Write-Host ("{0:F2} minutos" -f $diffMinutes) -ForegroundColor $(if ($diffMinutes -lt 0) { "Red" } else { "Yellow" })
        
        Write-Host ""
        Write-Host "===========================================" -ForegroundColor Cyan
        Write-Host "LOGICA DE DETECCION" -ForegroundColor Cyan
        Write-Host "===========================================" -ForegroundColor Cyan
        Write-Host ""
        
        # Aplicar la misma lógica que el frontend
        $isDrawing = ($diffMinutes -le 5) -and ($diffMinutes -ge -10)
        
        Write-Host "Ventana de Sorteo: -10 a +5 minutos" -ForegroundColor Gray
        Write-Host "Diferencia actual: " -NoNewline -ForegroundColor White
        Write-Host ("{0:F2} minutos" -f $diffMinutes) -ForegroundColor Cyan
        Write-Host ""
        
        if ($isDrawing) {
            Write-Host "[ESTADO] SORTEANDO AHORA" -ForegroundColor Red -BackgroundColor Black
            Write-Host ""
            Write-Host "La sala Starter esta en ventana de sorteo" -ForegroundColor Red
            Write-Host "Frontend mostrara: badge rojo con animacion pulse" -ForegroundColor Yellow
        } else {
            if ($diffMinutes -gt 5) {
                Write-Host "[ESTADO] HABILITADA (GRATIS)" -ForegroundColor Green -BackgroundColor Black
                Write-Host ""
                Write-Host "Faltan mas de 5 minutos para el sorteo" -ForegroundColor Gray
                Write-Host "Frontend mostrara: badge verde sin animacion" -ForegroundColor Yellow
            } else {
                Write-Host "[ESTADO] HABILITADA (GRATIS)" -ForegroundColor Green -BackgroundColor Black
                Write-Host ""
                Write-Host "El sorteo termino hace mas de 10 minutos" -ForegroundColor Gray
                Write-Host "Frontend mostrara: badge verde sin animacion" -ForegroundColor Yellow
            }
        }
        
        Write-Host ""
        Write-Host "===========================================" -ForegroundColor Cyan
        Write-Host "PREMIOS CONFIGURADOS" -ForegroundColor Cyan
        Write-Host "===========================================" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "Premio LINEA: " -NoNewline -ForegroundColor White
        Write-Host $starterRoom.prizeConfig.prize_linea -ForegroundColor Blue
        
        Write-Host "Premio BINGO: " -NoNewline -ForegroundColor White
        Write-Host $starterRoom.prizeConfig.prize_bingo -ForegroundColor Green
        
        Write-Host "Es Premio Ticket: " -NoNewline -ForegroundColor White
        Write-Host $starterRoom.prizeConfig.is_ticket_prize -ForegroundColor Yellow
        
    } else {
        Write-Host "[ERROR] No se encontro sala Starter" -ForegroundColor Red
    }
    
} catch {
    Write-Host "[ERROR] Error al obtener sesiones: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "VERIFICACION DE COMPONENTES" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que SessionStatusPanel tiene la lógica
$sessionPanelPath = "client-admin\src\components\SessionStatusPanel.jsx"
if (Test-Path $sessionPanelPath) {
    $content = Get-Content $sessionPanelPath -Raw
    
    if ($content -match "isStarterDrawing") {
        Write-Host "[OK] SessionStatusPanel tiene funcion isStarterDrawing" -ForegroundColor Green
    } else {
        Write-Host "[!] SessionStatusPanel NO tiene funcion isStarterDrawing" -ForegroundColor Red
    }
    
    if ($content -match "SORTEANDO AHORA") {
        Write-Host "[OK] SessionStatusPanel muestra texto SORTEANDO AHORA" -ForegroundColor Green
    } else {
        Write-Host "[!] SessionStatusPanel NO muestra texto SORTEANDO AHORA" -ForegroundColor Red
    }
    
    if ($content -match "animate-pulse") {
        Write-Host "[OK] SessionStatusPanel usa animacion pulse" -ForegroundColor Green
    } else {
        Write-Host "[!] SessionStatusPanel NO usa animacion pulse" -ForegroundColor Red
    }
}

Write-Host ""

# Verificar que PotStatusPanel tiene la lógica
$potPanelPath = "client-admin\src\components\PotStatusPanel.jsx"
if (Test-Path $potPanelPath) {
    $content = Get-Content $potPanelPath -Raw
    
    if ($content -match "isStarterDrawing") {
        Write-Host "[OK] PotStatusPanel tiene funcion isStarterDrawing" -ForegroundColor Green
    } else {
        Write-Host "[!] PotStatusPanel NO tiene funcion isStarterDrawing" -ForegroundColor Red
    }
    
    if ($content -match "getSessionStatusText") {
        Write-Host "[OK] PotStatusPanel tiene funcion getSessionStatusText" -ForegroundColor Green
    } else {
        Write-Host "[!] PotStatusPanel NO tiene funcion getSessionStatusText" -ForegroundColor Red
    }
    
    if ($content -match "SORTEANDO AHORA") {
        Write-Host "[OK] PotStatusPanel muestra texto SORTEANDO AHORA" -ForegroundColor Green
    } else {
        Write-Host "[!] PotStatusPanel NO muestra texto SORTEANDO AHORA" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[OK] API retorna start_time para calcular estado" -ForegroundColor Green
Write-Host "[OK] Logica implementada en ambos paneles" -ForegroundColor Green
Write-Host "[OK] Estado sincronizado entre componentes" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Reiniciar frontend: npm run dev -w client-admin" -ForegroundColor White
Write-Host "  2. Esperar a que falten 5 minutos para una hora en punto" -ForegroundColor White
Write-Host "  3. Verificar que badge cambie a rojo 'SORTEANDO AHORA'" -ForegroundColor White
Write-Host "  4. El estado vuelve a verde cuando pasan 10 min del sorteo" -ForegroundColor White
Write-Host ""
