# TEST ESTADO DE SESIONES - Version mejorada
# Muestra Starter con premios de tickets

$ErrorActionPreference = "Stop"

Write-Host "`n=== TEST: ESTADO DE SESIONES ===" -ForegroundColor Cyan

# Login
Write-Host "`n[1/2] Autenticando..." -ForegroundColor Gray
$loginBody = @{
    username = 'Andy'
    password = 'andy2024'
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "OK Login exitoso" -ForegroundColor Green

# Obtener estado de sesiones
Write-Host "`n[2/2] Obteniendo estado de salas..." -ForegroundColor Gray
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/sessions/active" -Method GET -Headers @{"Authorization" = "Bearer $token"}
Write-Host "OK Datos recibidos`n" -ForegroundColor Green

# Mostrar resultados
foreach ($roomData in $response.rooms) {
    $room = $roomData.room.ToUpper()
    
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host "SALA: $room" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Yellow
    
    # Sesion Actual
    if ($roomData.currentSession) {
        $session = $roomData.currentSession
        
        if ($null -eq $session.start_time -or [string]::IsNullOrEmpty($session.start_time)) {
            Write-Host "`nSESION ACTUAL: Error - start_time null" -ForegroundColor Red
        } else {
            $datetime = [DateTime]::Parse($session.start_time).ToString("ddd dd/MM HH:mm")
            $status = if ($session.status -eq 'playing') { 'SORTEANDO' } else { 'HABILITADA' }
            
            Write-Host "`nSESION ACTUAL $(if($session.id){"(ID: $($session.id))"}else{"(Virtual)"})" -ForegroundColor Cyan
            Write-Host "  Horario: $datetime" -ForegroundColor White
            Write-Host "  Estado: $status" -ForegroundColor Green
            
            # Premios segun tipo de sala
            if ($roomData.prizeConfig -and $roomData.prizeConfig.is_ticket_prize -eq $true) {
                Write-Host "  Premio LINEA: $($roomData.prizeConfig.prize_linea)" -ForegroundColor Cyan
                Write-Host "  Premio BINGO: $($roomData.prizeConfig.prize_bingo)" -ForegroundColor Cyan
            } else {
                Write-Host "  Cartones: $($session.total_paid_cards)" -ForegroundColor White
                if ($session.current_pot_linea) {
                    Write-Host "  LINEA: `$$($session.current_pot_linea)" -ForegroundColor Yellow
                }
                if ($session.current_pot_bingo) {
                    Write-Host "  BINGO: `$$($session.current_pot_bingo)" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "`nSESION ACTUAL: Sin sesion activa" -ForegroundColor DarkGray
    }
    
    # Proximas Sesiones
    Write-Host "`nPROXIMAS SESIONES: $($roomData.upcomingSessions.Count)" -ForegroundColor Cyan
    
    if ($roomData.upcomingSessions.Count -eq 0) {
        Write-Host "  (No hay sesiones)" -ForegroundColor DarkGray
    } else {
        $count = 1
        foreach ($upcoming in $roomData.upcomingSessions) {
            if ($null -ne $upcoming.start_time -and ![string]::IsNullOrEmpty($upcoming.start_time)) {
                try {
                    $datetime = [DateTime]::Parse($upcoming.start_time).ToString("ddd dd/MM HH:mm")
                    $source = if ($upcoming.source -eq 'calculated') { '[CALC]' } else { "[BD]" }
                    Write-Host "  $count. $datetime $source" -ForegroundColor Gray
                    $count++
                } catch {
                    Write-Host "  $count. Error en fecha" -ForegroundColor Red
                    $count++
                }
            }
        }
    }
    
    # Info de sala
    if ($roomData.prizeConfig -and $roomData.prizeConfig.is_ticket_prize -eq $true) {
        Write-Host "`nINFO SALA:" -ForegroundColor Magenta
        Write-Host "  Tipo: GRATIS - Sorteo cada hora" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

Write-Host "=== TEST COMPLETADO ===`n" -ForegroundColor Green
