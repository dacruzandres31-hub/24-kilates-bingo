# SIMULADOR DE SORTEOS - Bingo 24K
# Simula el ciclo completo: active -> playing -> completed

param(
    [Parameter(Mandatory=$false)]
    [int]$SessionId = 16
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== SIMULADOR DE SORTEOS ===" -ForegroundColor Cyan

function Invoke-MySQL {
    param([string]$Query)
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pbingo2024 bingo_24k -e $Query -N 2>&1 | Where-Object { $_ -notmatch 'Warning' }
}

# Obtener info de la sesion
Write-Host "`n[1/5] Verificando sesion $SessionId..." -ForegroundColor Gray
$result = Invoke-MySQL "SELECT room, start_time, status FROM game_sessions WHERE id=$SessionId;"

if ([string]::IsNullOrEmpty($result)) {
    Write-Host "ERROR: Sesion $SessionId no existe" -ForegroundColor Red
    exit 1
}

$parts = $result -split "`t"
$room = $parts[0]
$startTime = $parts[1]
$status = $parts[2]

Write-Host "OK Sesion encontrada" -ForegroundColor Green
Write-Host "  Sala: $room" -ForegroundColor White
Write-Host "  Estado actual: $status" -ForegroundColor White

# Paso 1: Activar sesion
Write-Host "`n[2/5] Activando sesion ($status -> active)..." -ForegroundColor Gray
Invoke-MySQL "UPDATE game_sessions SET status='active', updated_at=NOW() WHERE id=$SessionId;" | Out-Null
Write-Host "OK Sesion activada" -ForegroundColor Green

Start-Sleep -Seconds 2

# Paso 2: Iniciar sorteo
Write-Host "`n[3/5] Iniciando sorteo (active -> playing)..." -ForegroundColor Gray
Invoke-MySQL "UPDATE game_sessions SET status='playing', updated_at=NOW() WHERE id=$SessionId;" | Out-Null
Write-Host "OK Sorteo iniciado" -ForegroundColor Green

Write-Host "`nSimulando extraccion de bolas..." -ForegroundColor Cyan
for ($i = 1; $i -le 5; $i++) {
    $ball = Get-Random -Minimum 1 -Maximum 76
    Write-Host "  Bola $i : $ball" -ForegroundColor White
    Start-Sleep -Milliseconds 600
}

Start-Sleep -Seconds 2

# Paso 3: Completar sorteo
Write-Host "`n[4/5] Finalizando sorteo (playing -> completed)..." -ForegroundColor Gray

$winnerLinea = Get-Random -Minimum 1 -Maximum 100
$winnerBingo = Get-Random -Minimum 1 -Maximum 100

$updateQuery = "UPDATE game_sessions SET status='completed', winner_linea_user_id=$winnerLinea, winner_bingo_user_id=$winnerBingo, completed_at=NOW(), updated_at=NOW() WHERE id=$SessionId;"
Invoke-MySQL $updateQuery | Out-Null

Write-Host "OK Sorteo completado" -ForegroundColor Green
Write-Host "  Ganador LINEA: User #$winnerLinea (simulado)" -ForegroundColor Yellow
Write-Host "  Ganador BINGO: User #$winnerBingo (simulado)" -ForegroundColor Yellow

# Paso 4: Mostrar resumen
Write-Host "`n[5/5] Resumen final:" -ForegroundColor Gray

$finalResult = Invoke-MySQL "SELECT id, room, status, current_pot_linea, current_pot_bingo, total_paid_cards FROM game_sessions WHERE id=$SessionId;"
$parts = $finalResult -split "`t"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE SORTEO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ID Sesion: $($parts[0])" -ForegroundColor White
Write-Host "Sala: $($parts[1])" -ForegroundColor White
Write-Host "Estado: $($parts[2])" -ForegroundColor Green
Write-Host "Premio LINEA: `$$($parts[3])" -ForegroundColor Yellow
Write-Host "Premio BINGO: `$$($parts[4])" -ForegroundColor Yellow
Write-Host "Cartones vendidos: $($parts[5])" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "`n=== SIMULACION COMPLETADA ===`n" -ForegroundColor Green
