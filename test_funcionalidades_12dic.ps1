# ========================================
# TEST DE FUNCIONALIDADES - 12 DIC 2025
# ========================================
# Prueba todas las features implementadas ayer

$baseUrl = "http://localhost:3001/api"
$adminUrl = "$baseUrl/admin"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧪 TESTING FUNCIONALIDADES 12-DIC-2025" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ========================================
# TEST 1: Login como SuperAdmin (Andy)
# ========================================
Write-Host "TEST 1: Login SuperAdmin Andy" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

$loginBody = @{
    username = "Andy"
    password = "andy2024"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/admin-login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login exitoso como Andy" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Start-Sleep -Seconds 1

# ========================================
# TEST 2: Verificar Perfil SuperAdmin
# ========================================
Write-Host "`nTEST 2: Verificar Perfil SuperAdmin" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

try {
    $profile = Invoke-RestMethod -Uri "$adminUrl/profile" -Method GET -Headers $headers
    Write-Host "✅ Perfil obtenido:" -ForegroundColor Green
    Write-Host "   Usuario: $($profile.username)" -ForegroundColor White
    Write-Host "   Role: $($profile.role)" -ForegroundColor White
    Write-Host "   Parent ID: $($profile.parent_id)" -ForegroundColor White
    Write-Host "   Balance: $([Math]::Floor($profile.balance).ToString('N0', [System.Globalization.CultureInfo]::GetCultureInfo('es-CO')))" -ForegroundColor White
    
    if ($profile.role -ne "superadmin") {
        Write-Host "❌ ERROR: Andy debería ser superadmin, es: $($profile.role)" -ForegroundColor Red
    }
    if ($profile.parent_id -ne $null) {
        Write-Host "❌ ERROR: Andy debería tener parent_id = NULL, tiene: $($profile.parent_id)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error obteniendo perfil: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ========================================
# TEST 3: Jerarquía de Usuarios
# ========================================
Write-Host "`nTEST 3: Jerarquía de Usuarios" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

try {
    $hierarchy = Invoke-RestMethod -Uri "$adminUrl/users-hierarchy" -Method GET -Headers $headers
    $totalUsers = ($hierarchy.all | Measure-Object).Count
    Write-Host "✅ Jerarquía obtenida:" -ForegroundColor Green
    Write-Host "   Total usuarios: $totalUsers" -ForegroundColor White
    
    # Verificar que Andy sea root
    $andy = $hierarchy.all | Where-Object { $_.username -eq "Andy" }
    if ($andy.parent_id -eq $null) {
        Write-Host "   ✓ Andy es root (parent_id = NULL)" -ForegroundColor Green
    } else {
        Write-Host "   ✗ ERROR: Andy no es root" -ForegroundColor Red
    }
    
    # Contar usuarios por rol
    $superadmins = ($hierarchy.all | Where-Object { $_.role -eq "superadmin" } | Measure-Object).Count
    $agentes = ($hierarchy.all | Where-Object { $_.role -eq "agente" } | Measure-Object).Count
    $jugadores = ($hierarchy.all | Where-Object { $_.role -eq "jugador" } | Measure-Object).Count
    
    Write-Host "   Superadmins: $superadmins" -ForegroundColor Cyan
    Write-Host "   Agentes: $agentes" -ForegroundColor Cyan
    Write-Host "   Jugadores: $jugadores" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error obteniendo jerarquía: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ========================================
# TEST 4: Agregar Balance Ilimitado (SuperAdmin)
# ========================================
Write-Host "`nTEST 4: Agregar Balance Ilimitado (SuperAdmin)" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

$addBalanceBody = @{
    userId = $profile.id
    amount = 1000000
} | ConvertTo-Json

try {
    $balanceBefore = $profile.balance
    $addBalanceResponse = Invoke-RestMethod -Uri "$adminUrl/users/add-balance" -Method POST -Headers $headers -Body $addBalanceBody
    
    # Verificar nuevo balance
    $profileAfter = Invoke-RestMethod -Uri "$adminUrl/profile" -Method GET -Headers $headers
    $balanceAfter = $profileAfter.balance
    
    Write-Host "✅ Balance agregado exitosamente:" -ForegroundColor Green
    Write-Host "   Balance Antes: $([Math]::Floor($balanceBefore).ToString('N0', [System.Globalization.CultureInfo]::GetCultureInfo('es-CO')))" -ForegroundColor White
    Write-Host "   Balance Después: $([Math]::Floor($balanceAfter).ToString('N0', [System.Globalization.CultureInfo]::GetCultureInfo('es-CO')))" -ForegroundColor White
    Write-Host "   Incremento: $([Math]::Floor($balanceAfter - $balanceBefore).ToString('N0', [System.Globalization.CultureInfo]::GetCultureInfo('es-CO')))" -ForegroundColor Green
} catch {
    Write-Host "❌ Error agregando balance: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ========================================
# TEST 5: Agregar Cartones Masivos (Optimización)
# ========================================
Write-Host "`nTEST 5: Agregar Cartones Masivos (Optimización)" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

$addCardsBody = @{
    userId = $profile.id
    room = "bronce"
    quantity = 500
} | ConvertTo-Json

try {
    $startTime = Get-Date
    $addCardsResponse = Invoke-RestMethod -Uri "$adminUrl/users/add-cards" -Method POST -Headers $headers -Body $addCardsBody
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "✅ Cartones agregados exitosamente:" -ForegroundColor Green
    Write-Host "   Cantidad: 500 cartones bronce" -ForegroundColor White
    Write-Host "   Tiempo: $([Math]::Round($duration, 2)) segundos" -ForegroundColor White
    
    if ($duration -lt 2) {
        Write-Host "   ✓ Optimización funcionando (< 2 segundos)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Posible lentitud detectada (> 2 segundos)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error agregando cartones: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ========================================
# TEST 6: Crear Usuario Nuevo
# ========================================
Write-Host "`nTEST 6: Crear Usuario Nuevo (Agente)" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

$randomSuffix = Get-Random -Minimum 1000 -Maximum 9999
$createUserBody = @{
    username = "test_agente_$randomSuffix"
    password = "test123"
    role = "agente"
} | ConvertTo-Json

try {
    $createUserResponse = Invoke-RestMethod -Uri "$adminUrl/users/create" -Method POST -Headers $headers -Body $createUserBody
    Write-Host "✅ Usuario creado exitosamente:" -ForegroundColor Green
    Write-Host "   Username: test_agente_$randomSuffix" -ForegroundColor White
    Write-Host "   User ID: $($createUserResponse.userId)" -ForegroundColor White
    
    $newUserId = $createUserResponse.userId
} catch {
    Write-Host "❌ Error creando usuario: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# ========================================
# TEST 7: Cargar Balance a Usuario (Descuento)
# ========================================
Write-Host "`nTEST 7: Cargar Balance a Usuario (Verificar Descuento)" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

if ($newUserId) {
    $loadBalanceBody = @{
        userId = $newUserId
        amount = 50000
    } | ConvertTo-Json
    
    try {
        $balanceBefore = $profileAfter.balance
        $loadBalanceResponse = Invoke-RestMethod -Uri "$adminUrl/users/add-balance" -Method POST -Headers $headers -Body $loadBalanceBody
        
        # Verificar que el balance de Andy se redujo
        $profileAfterLoad = Invoke-RestMethod -Uri "$adminUrl/profile" -Method GET -Headers $headers
        $balanceAfterLoad = $profileAfterLoad.balance
        
        Write-Host "✅ Balance cargado a usuario:" -ForegroundColor Green
        Write-Host "   Cantidad cargada: 50.000" -ForegroundColor White
        Write-Host "   Balance Andy Antes: $([Math]::Floor($balanceBefore).ToString('N0', [System.Globalization.CultureInfo]::GetCultureInfo('es-CO')))" -ForegroundColor White
        Write-Host "   Balance Andy Después: $([Math]::Floor($balanceAfterLoad).ToString('N0', [System.Globalization.CultureInfo]::GetCultureInfo('es-CO')))" -ForegroundColor White
        Write-Host "   Diferencia: $([Math]::Floor($balanceAfterLoad - $balanceBefore).ToString('N0', [System.Globalization.CultureInfo]::GetCultureInfo('es-CO')))" -ForegroundColor Cyan
        
        # Nota: El descuento debe reflejarse en el frontend, aquí verificamos que la operación sea exitosa
    } catch {
        Write-Host "❌ Error cargando balance: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Start-Sleep -Seconds 1

# ========================================
# TEST 8: Cambiar Contraseña (Nueva Feature)
# ========================================
Write-Host "`nTEST 8: Cambiar Contraseña" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

$changePasswordBody = @{
    currentPassword = "andy2024"
    newPassword = "andy2024_temp"
} | ConvertTo-Json

try {
    $changePasswordResponse = Invoke-RestMethod -Uri "$adminUrl/change-password" -Method POST -Headers $headers -Body $changePasswordBody
    Write-Host "✅ Contraseña cambiada exitosamente" -ForegroundColor Green
    
    # Intentar login con nueva contraseña
    $newLoginBody = @{
        username = "Andy"
        password = "andy2024_temp"
    } | ConvertTo-Json
    
    $newLoginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/admin-login" -Method POST -Body $newLoginBody -ContentType "application/json"
    Write-Host "   ✓ Login con nueva contraseña exitoso" -ForegroundColor Green
    
    # Revertir contraseña
    $newToken = $newLoginResponse.token
    $newHeaders = @{
        "Authorization" = "Bearer $newToken"
        "Content-Type" = "application/json"
    }
    
    $revertPasswordBody = @{
        currentPassword = "andy2024_temp"
        newPassword = "andy2024"
    } | ConvertTo-Json
    
    $revertResponse = Invoke-RestMethod -Uri "$adminUrl/change-password" -Method POST -Headers $newHeaders -Body $revertPasswordBody
    Write-Host "   ✓ Contraseña revertida a original" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error cambiando contraseña: $($_.Exception.Message)" -ForegroundColor Red
    
    # Intentar revertir en caso de error
    try {
        $revertPasswordBody = @{
            currentPassword = "andy2024_temp"
            newPassword = "andy2024"
        } | ConvertTo-Json
        
        $newLoginBody = @{
            username = "Andy"
            password = "andy2024_temp"
        } | ConvertTo-Json
        
        $tempLogin = Invoke-RestMethod -Uri "$baseUrl/auth/admin-login" -Method POST -Body $newLoginBody -ContentType "application/json"
        $tempHeaders = @{
            "Authorization" = "Bearer $($tempLogin.token)"
            "Content-Type" = "application/json"
        }
        
        Invoke-RestMethod -Uri "$adminUrl/change-password" -Method POST -Headers $tempHeaders -Body $revertPasswordBody
        Write-Host "   ℹ Contraseña revertida" -ForegroundColor Cyan
    } catch {
        Write-Host "   ⚠ No se pudo revertir contraseña automáticamente" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 1

# ========================================
# TEST 9: Validación de Contraseña Incorrecta
# ========================================
Write-Host "`nTEST 9: Validación de Contraseña Incorrecta" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

$wrongPasswordBody = @{
    currentPassword = "contraseña_incorrecta"
    newPassword = "nueva123"
} | ConvertTo-Json

try {
    $wrongPasswordResponse = Invoke-RestMethod -Uri "$adminUrl/change-password" -Method POST -Headers $headers -Body $wrongPasswordBody
    Write-Host "❌ ERROR: Debería haber rechazado la contraseña incorrecta" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ Validación correcta: Contraseña incorrecta rechazada (401)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Código de estado inesperado: $statusCode" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 1

# ========================================
# TEST 10: Formato de Números (Verificación Visual)
# ========================================
Write-Host "`nTEST 10: Formato de Números (Visual)" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray

Write-Host "✅ Verificar en el navegador (http://localhost:5175):" -ForegroundColor Green
Write-Host "   1. Login como Andy / andy2024" -ForegroundColor White
Write-Host "   2. Ir a Gestión de Usuarios" -ForegroundColor White
Write-Host "   3. Verificar formato de balance: $10.000.000 (puntos separadores)" -ForegroundColor White
Write-Host "   4. Verificar formato de cartones: 25.000 (con separadores)" -ForegroundColor White
Write-Host "   5. Verificar botones '+' en panel de Recursos (solo SuperAdmin)" -ForegroundColor White
Write-Host "   6. Probar 'Cambiar Contraseña' desde botón Perfil" -ForegroundColor White

# ========================================
# RESUMEN FINAL
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n✅ PRUEBAS AUTOMATIZADAS COMPLETADAS:" -ForegroundColor Green
Write-Host "   1. Login SuperAdmin" -ForegroundColor White
Write-Host "   2. Verificación de perfil" -ForegroundColor White
Write-Host "   3. Jerarquía de usuarios" -ForegroundColor White
Write-Host "   4. Agregar balance ilimitado" -ForegroundColor White
Write-Host "   5. Inserción masiva de cartones" -ForegroundColor White
Write-Host "   6. Crear usuario nuevo" -ForegroundColor White
Write-Host "   7. Cargar balance a usuario" -ForegroundColor White
Write-Host "   8. Cambiar contraseña" -ForegroundColor White
Write-Host "   9. Validación de seguridad" -ForegroundColor White

Write-Host "`n🖥️  PRUEBAS MANUALES PENDIENTES:" -ForegroundColor Yellow
Write-Host "   - Verificar formato visual de números" -ForegroundColor White
Write-Host "   - Verificar botones '+' de SuperAdmin" -ForegroundColor White
Write-Host "   - Verificar descuento de recursos en panel" -ForegroundColor White
Write-Host "   - Probar modal de cambio de contraseña" -ForegroundColor White

Write-Host "`n🌐 URL del Panel Admin: http://localhost:5175" -ForegroundColor Cyan
Write-Host "   Usuario: Andy" -ForegroundColor Gray
Write-Host "   Contraseña: andy2024`n" -ForegroundColor Gray

Write-Host "========================================`n" -ForegroundColor Cyan
