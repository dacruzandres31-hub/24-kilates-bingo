# Script de verificacion rapida de produccion Bingo 24K
# Uso: .\verificar_produccion.ps1

Write-Host "[BINGO 24K] VERIFICACION DE PRODUCCION" -ForegroundColor Cyan
Write-Host ("=" * 50)

# 1. Health Check
Write-Host "`n[1] Health Check API..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "https://24kilates.xyz/api/health" -TimeoutSec 10
    Write-Host "[OK] API OK - $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] API NO RESPONDE" -ForegroundColor Red
}

# 2. Login Andy
Write-Host "`n[2] Probando login Andy..." -ForegroundColor Yellow
$headers = $null
try {
    $loginResult = Invoke-RestMethod -Uri "https://24kilates.xyz/api/auth/login" -Method Post -ContentType "application/json" -Body (@{username="Andy";password="Admin123!"} | ConvertTo-Json)
    if ($loginResult.success) {
        Write-Host "[OK] Login OK" -ForegroundColor Green
        $token = $loginResult.data.token
        $headers = @{Authorization="Bearer $token"}
    } else {
        Write-Host "[ERROR] Login fallo" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Error de login: $_" -ForegroundColor Red
}

# 3. Room Settings
if ($headers) {
    Write-Host "`n[3] Configuracion de salas..." -ForegroundColor Yellow
    try {
        $rooms = Invoke-RestMethod -Uri "https://24kilates.xyz/api/superadmin/room-settings" -Headers $headers
        if ($rooms.success) {
            Write-Host "[OK] Room settings OK - $($rooms.settings.Count) salas" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ERROR] Error room settings: $_" -ForegroundColor Red
    }

    # 4. Schedules
    Write-Host "`n[4] Horarios de salas..." -ForegroundColor Yellow
    try {
        $schedules = Invoke-RestMethod -Uri "https://24kilates.xyz/api/admin/schedules" -Headers $headers
        if ($schedules.success) {
            Write-Host "[OK] Schedules OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ERROR] Error schedules: $_" -ForegroundColor Red
    }
}

# 5. PM2 Status (via SSH)
Write-Host "`n[5] Estado del servidor (SSH)..." -ForegroundColor Yellow
try {
    $pm2Status = ssh bingo-prod "pm2 jlist" 2>$null | ConvertFrom-Json
    $app = $pm2Status[0]
    Write-Host "[OK] PM2: $($app.name) - $($app.pm2_env.status) (pid: $($app.pid))" -ForegroundColor Green
} catch {
    Write-Host "[WARN] No se pudo verificar PM2 (SSH requerido)" -ForegroundColor Yellow
}

Write-Host ("`n" + ("=" * 50))
Write-Host "[FIN] Verificacion completada" -ForegroundColor Cyan
