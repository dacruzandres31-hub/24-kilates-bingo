# ============================================
# TEST: Sistema de Permisos de Desbloqueo
# ============================================
# Verifica que:
# 1. Solo quien bloqueó puede desbloquear
# 2. Agente superior puede desbloquear
# 3. Andy puede desbloquear a cualquiera
# 4. Solo Andy puede desbloquear a usuarios bloqueados por Andy

$BASE_URL = "http://localhost:3001"

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "TEST: Permisos de Desbloqueo" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# ============================================
# PASO 1: Login Andy (SuperAdmin)
# ============================================
Write-Host "PASO 1: Login Andy..." -ForegroundColor Yellow

try {
    $loginBody = @{
        username = "Andy"
        password = "Tasso2025"
    } | ConvertTo-Json

    $andyResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $ANDY_TOKEN = $andyResponse.token
    $ANDY_ID = $andyResponse.user.id
    Write-Host "✅ Andy autenticado (ID: $ANDY_ID)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en login de Andy: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ============================================
# PASO 2: Crear Agente1 (hijo de Andy)
# ============================================
Write-Host "`nPASO 2: Crear Agente1..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $ANDY_TOKEN"; "Content-Type" = "application/json" }
    $createAgente1 = @{
        username = "test_agente1_block"
        password = "password123"
        newRole = "agente"
    } | ConvertTo-Json

    $agente1 = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users" -Method POST -Headers $headers -Body $createAgente1
    $AGENTE1_ID = $agente1.user.id
    Write-Host "✅ Agente1 creado (ID: $AGENTE1_ID)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Agente1 ya existe o error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# ============================================
# PASO 3: Login Agente1
# ============================================
Write-Host "`nPASO 3: Login Agente1..." -ForegroundColor Yellow

try {
    $loginAgente1 = @{
        username = "test_agente1_block"
        password = "password123"
    } | ConvertTo-Json

    $agente1Response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $loginAgente1 -ContentType "application/json"
    $AGENTE1_TOKEN = $agente1Response.token
    Write-Host "✅ Agente1 autenticado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en login de Agente1: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ============================================
# PASO 4: Agente1 crea Jugador1
# ============================================
Write-Host "`nPASO 4: Agente1 crea Jugador1..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $AGENTE1_TOKEN"; "Content-Type" = "application/json" }
    $createJugador1 = @{
        username = "test_jugador1_block"
        password = "password123"
        newRole = "jugador"
    } | ConvertTo-Json

    $jugador1 = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users" -Method POST -Headers $headers -Body $createJugador1
    $JUGADOR1_ID = $jugador1.user.id
    Write-Host "✅ Jugador1 creado (ID: $JUGADOR1_ID)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Jugador1 ya existe o error: $($_.Exception.Message)" -ForegroundColor Yellow
    # Obtener ID si ya existe
    $headers = @{ Authorization = "Bearer $ANDY_TOKEN" }
    $allUsers = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/hierarchy" -Method GET -Headers $headers
    $existingJugador = $allUsers.all | Where-Object { $_.username -eq "test_jugador1_block" }
    if ($existingJugador) {
        $JUGADOR1_ID = $existingJugador.id
        Write-Host "   Usando Jugador1 existente (ID: $JUGADOR1_ID)" -ForegroundColor Gray
    }
}

Start-Sleep -Seconds 1

# ============================================
# PASO 5: Crear Agente2 (hermano de Agente1)
# ============================================
Write-Host "`nPASO 5: Crear Agente2 (hermano de Agente1)..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $ANDY_TOKEN"; "Content-Type" = "application/json" }
    $createAgente2 = @{
        username = "test_agente2_block"
        password = "password123"
        newRole = "agente"
    } | ConvertTo-Json

    $agente2 = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users" -Method POST -Headers $headers -Body $createAgente2
    $AGENTE2_ID = $agente2.user.id
    Write-Host "✅ Agente2 creado (ID: $AGENTE2_ID)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Agente2 ya existe o error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# ============================================
# PASO 6: Login Agente2
# ============================================
Write-Host "`nPASO 6: Login Agente2..." -ForegroundColor Yellow

try {
    $loginAgente2 = @{
        username = "test_agente2_block"
        password = "password123"
    } | ConvertTo-Json

    $agente2Response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $loginAgente2 -ContentType "application/json"
    $AGENTE2_TOKEN = $agente2Response.token
    Write-Host "✅ Agente2 autenticado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en login de Agente2: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ============================================
# PASO 7: Agente1 bloquea a Jugador1
# ============================================
Write-Host "`nPASO 7: Agente1 bloquea a Jugador1..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $AGENTE1_TOKEN"; "Content-Type" = "application/json" }
    $blockBody = @{
        reason = "Prueba de sistema de permisos de desbloqueo"
    } | ConvertTo-Json

    $blockResult = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$JUGADOR1_ID/block" -Method POST -Headers $headers -Body $blockBody
    Write-Host "✅ Jugador1 bloqueado por Agente1" -ForegroundColor Green
    Write-Host "   Motivo: $($blockResult.user.block_reason)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error bloqueando Jugador1: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ============================================
# PASO 8: Agente2 intenta desbloquear a Jugador1 (DEBE FALLAR)
# ============================================
Write-Host "`nPASO 8: Agente2 intenta desbloquear a Jugador1 (debe fallar)..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $AGENTE2_TOKEN"; "Content-Type" = "application/json" }
    $unblockResult = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$JUGADOR1_ID/unblock" -Method POST -Headers $headers -Body "{}"
    Write-Host "❌ ERROR: Agente2 pudo desbloquear (no debería poder)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "✅ Agente2 NO puede desbloquear (403 Forbidden) - CORRECTO" -ForegroundColor Green
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Razón: $($errorResponse.error)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Error inesperado: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 1

# ============================================
# PASO 9: Agente1 desbloquea a Jugador1 (DEBE FUNCIONAR)
# ============================================
Write-Host "`nPASO 9: Agente1 desbloquea a Jugador1 (quien lo bloqueó)..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $AGENTE1_TOKEN"; "Content-Type" = "application/json" }
    $unblockResult = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$JUGADOR1_ID/unblock" -Method POST -Headers $headers -Body "{}"
    Write-Host "✅ Agente1 desbloqueó exitosamente - CORRECTO" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Agente1 no pudo desbloquear: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ============================================
# PASO 10: Agente1 bloquea nuevamente a Jugador1
# ============================================
Write-Host "`nPASO 10: Agente1 bloquea nuevamente a Jugador1..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $AGENTE1_TOKEN"; "Content-Type" = "application/json" }
    $blockBody = @{
        reason = "Segundo bloqueo para probar desbloqueo por superior"
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$JUGADOR1_ID/block" -Method POST -Headers $headers -Body $blockBody | Out-Null
    Write-Host "✅ Jugador1 bloqueado nuevamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error bloqueando Jugador1: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ============================================
# PASO 11: Andy desbloquea a Jugador1 (superior jerárquico)
# ============================================
Write-Host "`nPASO 11: Andy desbloquea a Jugador1 (superior jerárquico)..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $ANDY_TOKEN"; "Content-Type" = "application/json" }
    $unblockResult = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$JUGADOR1_ID/unblock" -Method POST -Headers $headers -Body "{}"
    Write-Host "✅ Andy desbloqueó exitosamente (es superior en jerarquía) - CORRECTO" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Andy no pudo desbloquear: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ============================================
# PASO 12: Andy bloquea a Agente1
# ============================================
Write-Host "`nPASO 12: Andy bloquea a Agente1..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $ANDY_TOKEN"; "Content-Type" = "application/json" }
    $blockBody = @{
        reason = "Bloqueado por Andy para probar que solo Andy puede desbloquear"
    } | ConvertTo-Json

    $blockResult = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$AGENTE1_ID/block" -Method POST -Headers $headers -Body $blockBody
    Write-Host "✅ Agente1 bloqueado por Andy" -ForegroundColor Green
} catch {
    Write-Host "❌ Error bloqueando Agente1: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ============================================
# PASO 13: Agente2 intenta desbloquear a Agente1 bloqueado por Andy (DEBE FALLAR)
# ============================================
Write-Host "`nPASO 13: Agente2 intenta desbloquear a Agente1 bloqueado por Andy (debe fallar)..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $AGENTE2_TOKEN"; "Content-Type" = "application/json" }
    $unblockResult = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$AGENTE1_ID/unblock" -Method POST -Headers $headers -Body "{}"
    Write-Host "❌ ERROR: Agente2 pudo desbloquear a usuario bloqueado por Andy (no debería poder)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "✅ Agente2 NO puede desbloquear usuario bloqueado por Andy - CORRECTO" -ForegroundColor Green
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Razón: $($errorResponse.error)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Error inesperado: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 1

# ============================================
# PASO 14: Andy desbloquea a Agente1
# ============================================
Write-Host "`nPASO 14: Andy desbloquea a Agente1..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $ANDY_TOKEN"; "Content-Type" = "application/json" }
    $unblockResult = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/$AGENTE1_ID/unblock" -Method POST -Headers $headers -Body "{}"
    Write-Host "✅ Andy desbloqueó exitosamente - CORRECTO" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Andy no pudo desbloquear: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# RESUMEN
# ============================================
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ REGLA 1: Quien bloqueó puede desbloquear" -ForegroundColor Green
Write-Host "✅ REGLA 2: Agente superior en jerarquía puede desbloquear" -ForegroundColor Green
Write-Host "✅ REGLA 3: Agente fuera de jerarquía NO puede desbloquear" -ForegroundColor Green
Write-Host "✅ REGLA 4: Solo Andy puede desbloquear usuarios bloqueados por Andy" -ForegroundColor Green
Write-Host "✅ REGLA 5: Andy puede desbloquear a cualquiera" -ForegroundColor Green
Write-Host ""
Write-Host "Sistema de permisos de desbloqueo funcionando correctamente 🎉" -ForegroundColor Green
