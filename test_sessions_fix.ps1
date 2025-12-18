# Test para verificar que el endpoint devuelve sesiones correctamente
Write-Host "===== TEST CLASIFICACIÓN DE SESIONES =====" -ForegroundColor Cyan

# 1. Login
Write-Host "`n1. Autenticando..." -ForegroundColor Yellow
$loginBody = @{username='Andy'; password='andy2024'} | ConvertTo-Json
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "   ✅ LOGIN OK" -ForegroundColor Green
} catch {
    Write-Host "   ❌ ERROR LOGIN: $_" -ForegroundColor Red
    exit 1
}

# 2. Obtener sesiones activas
Write-Host "`n2. Obteniendo sesiones activas..." -ForegroundColor Yellow
try {
    $activeResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/sessions/active" -Method GET -Headers @{"Authorization"="Bearer $token"}
    
    Write-Host "`n   === SESIONES ACTIVAS ===" -ForegroundColor Cyan
    Write-Host "   Total activas: $($activeResponse.active.Count)" -ForegroundColor Yellow
    
    if ($activeResponse.active.Count -gt 0) {
        $activeResponse.active | ForEach-Object {
            Write-Host "   - ID: $($_.id) | Sala: $($_.room) | Status: $($_.status)" -ForegroundColor Green
        }
    } else {
        Write-Host "   (ninguna)" -ForegroundColor Gray
    }
    
    Write-Host "`n   === SESIONES PRÓXIMAS ===" -ForegroundColor Cyan
    Write-Host "   Total próximas: $($activeResponse.upcoming.Count)" -ForegroundColor Yellow
    
    if ($activeResponse.upcoming.Count -gt 0) {
        $activeResponse.upcoming | Select-Object -First 10 | ForEach-Object {
            Write-Host "   - ID: $($_.id) | Sala: $($_.room) | Status: $($_.status)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   (ninguna)" -ForegroundColor Gray
    }
    
    # 3. Validación
    Write-Host "`n3. Validación:" -ForegroundColor Yellow
    if ($activeResponse.active.Count -le 4) {
        Write-Host "   ✅ CORRECTO: Máximo 4 sesiones activas (una por sala)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ ERROR: Hay $($activeResponse.active.Count) sesiones activas (debería ser máximo 4)" -ForegroundColor Red
    }
    
    # Verificar que no haya duplicados por sala
    $rooms = $activeResponse.active | Select-Object -ExpandProperty room
    $uniqueRooms = $rooms | Select-Object -Unique
    if ($rooms.Count -eq $uniqueRooms.Count) {
        Write-Host "   ✅ CORRECTO: No hay sesiones duplicadas por sala" -ForegroundColor Green
    } else {
        Write-Host "   ❌ ERROR: Hay salas con múltiples sesiones activas" -ForegroundColor Red
    }
    
} catch {
    Write-Host "   ❌ ERROR: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ TEST COMPLETO" -ForegroundColor Green
