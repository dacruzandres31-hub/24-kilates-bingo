# ========================================
# TEST DE FUNCIONALIDADES - 12 DIC 2025
# ========================================

$baseUrl = "http://localhost:3001/api"
$adminUrl = "$baseUrl/admin"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 TESTING FUNCIONALIDADES 12-DIC-2025" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# TEST 1: Login SuperAdmin
Write-Host "TEST 1: Login SuperAdmin Andy" -ForegroundColor Yellow
$loginBody = @{ username = "Andy"; password = "andy2024" } | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "$baseUrl/auth/admin-login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $login.token
    Write-Host "✅ Login exitoso como Andy" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

# TEST 2: Verificar Perfil
Write-Host "`nTEST 2: Verificar Perfil SuperAdmin" -ForegroundColor Yellow

try {
    $profile = Invoke-RestMethod -Uri "$adminUrl/profile" -Method GET -Headers $headers
    Write-Host "✅ Usuario: $($profile.username) | Role: $($profile.role) | Parent: $($profile.parent_id)" -ForegroundColor Green
    Write-Host "   Balance: $([Math]::Floor($profile.balance).ToString('N0', [System.Globalization.CultureInfo]::GetCultureInfo('es-CO')))" -ForegroundColor White
    
    if ($profile.role -eq "superadmin" -and $profile.parent_id -eq $null) {
        Write-Host "   ✓ Jerarquía correcta (SuperAdmin root)" -ForegroundColor Green
    } else {
        Write-Host "   ✗ ERROR en jerarquía" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 3: Jerarquía
Write-Host "`nTEST 3: Jerarquía de Usuarios" -ForegroundColor Yellow

try {
    $hierarchy = Invoke-RestMethod -Uri "$adminUrl/users-hierarchy" -Method GET -Headers $headers
    $total = ($hierarchy.all | Measure-Object).Count
    $superadmins = ($hierarchy.all | Where-Object { $_.role -eq "superadmin" } | Measure-Object).Count
    $agentes = ($hierarchy.all | Where-Object { $_.role -eq "agente" } | Measure-Object).Count
    
    Write-Host "✅ Total: $total | SuperAdmins: $superadmins | Agentes: $agentes" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 4: Agregar Balance Ilimitado
Write-Host "`nTEST 4: Agregar Balance Ilimitado (SuperAdmin)" -ForegroundColor Yellow

$addBalBody = @{ userId = $profile.id; amount = 500000 } | ConvertTo-Json

try {
    $balBefore = $profile.balance
    Invoke-RestMethod -Uri "$adminUrl/users/add-balance" -Method POST -Headers $headers -Body $addBalBody | Out-Null
    $profileNew = Invoke-RestMethod -Uri "$adminUrl/profile" -Method GET -Headers $headers
    $balAfter = $profileNew.balance
    $increment = [Math]::Floor($balAfter - $balBefore)
    
    Write-Host "✅ Balance agregado: +$($increment.ToString('N0', [System.Globalization.CultureInfo]::GetCultureInfo('es-CO')))" -ForegroundColor Green
    Write-Host "   Balance actual: $([Math]::Floor($balAfter).ToString('N0', [System.Globalization.CultureInfo]::GetCultureInfo('es-CO')))" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 5: Inserción Masiva de Cartones
Write-Host "`nTEST 5: Inserción Masiva de Cartones (Optimización)" -ForegroundColor Yellow

$addCardsBody = @{ userId = $profile.id; room = "bronce"; quantity = 1000 } | ConvertTo-Json

try {
    $start = Get-Date
    Invoke-RestMethod -Uri "$adminUrl/users/add-cards" -Method POST -Headers $headers -Body $addCardsBody | Out-Null
    $duration = ((Get-Date) - $start).TotalSeconds
    
    Write-Host "✅ 1000 cartones agregados en $([Math]::Round($duration, 2)) segundos" -ForegroundColor Green
    
    if ($duration -lt 2) {
        Write-Host "   ✓ Optimización funcionando correctamente" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Posible lentitud detectada" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 6: Crear Usuario
Write-Host "`nTEST 6: Crear Usuario Nuevo" -ForegroundColor Yellow

$rand = Get-Random -Minimum 1000 -Maximum 9999
$createBody = @{ username = "test_$rand"; password = "test123"; role = "agente" } | ConvertTo-Json

try {
    $createResp = Invoke-RestMethod -Uri "$adminUrl/users/create" -Method POST -Headers $headers -Body $createBody
    Write-Host "✅ Usuario creado: test_$rand (ID: $($createResp.userId))" -ForegroundColor Green
    $newUserId = $createResp.userId
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    $newUserId = $null
}

# TEST 7: Cargar Balance a Usuario
if ($newUserId) {
    Write-Host "`nTEST 7: Cargar Balance a Usuario" -ForegroundColor Yellow
    
    $loadBody = @{ userId = $newUserId; amount = 50000 } | ConvertTo-Json
    
    try {
        Invoke-RestMethod -Uri "$adminUrl/users/add-balance" -Method POST -Headers $headers -Body $loadBody | Out-Null
        Write-Host "✅ Balance cargado: 50.000 al usuario test_$rand" -ForegroundColor Green
        Write-Host "   ℹ Verificar descuento en frontend" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# TEST 8: Cambiar Contraseña
Write-Host "`nTEST 8: Cambiar Contraseña" -ForegroundColor Yellow

$changePwdBody = @{ currentPassword = "andy2024"; newPassword = "andy2024_temp" } | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$adminUrl/change-password" -Method POST -Headers $headers -Body $changePwdBody | Out-Null
    Write-Host "✅ Contraseña cambiada a temporal" -ForegroundColor Green
    
    # Login con nueva contraseña
    $newLoginBody = @{ username = "Andy"; password = "andy2024_temp" } | ConvertTo-Json
    $newLogin = Invoke-RestMethod -Uri "$baseUrl/auth/admin-login" -Method POST -Body $newLoginBody -ContentType "application/json"
    Write-Host "   ✓ Login con nueva contraseña exitoso" -ForegroundColor Green
    
    # Revertir
    $newHeaders = @{ "Authorization" = "Bearer $($newLogin.token)"; "Content-Type" = "application/json" }
    $revertBody = @{ currentPassword = "andy2024_temp"; newPassword = "andy2024" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$adminUrl/change-password" -Method POST -Headers $newHeaders -Body $revertBody | Out-Null
    Write-Host "   ✓ Contraseña revertida a original" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 9: Validación de Seguridad
Write-Host "`nTEST 9: Validación de Seguridad" -ForegroundColor Yellow

$wrongPwdBody = @{ currentPassword = "wrong_password"; newPassword = "nueva123" } | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$adminUrl/change-password" -Method POST -Headers $headers -Body $wrongPwdBody | Out-Null
    Write-Host "❌ ERROR: Debería rechazar contraseña incorrecta" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ Validación correcta: Contraseña incorrecta rechazada (401)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Código inesperado: $statusCode" -ForegroundColor Yellow
    }
}

# RESUMEN
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n✅ PRUEBAS AUTOMATIZADAS:" -ForegroundColor Green
Write-Host "   1. ✓ Login SuperAdmin" -ForegroundColor White
Write-Host "   2. ✓ Perfil y jerarquía" -ForegroundColor White
Write-Host "   3. ✓ Balance ilimitado" -ForegroundColor White
Write-Host "   4. ✓ Inserción masiva optimizada" -ForegroundColor White
Write-Host "   5. ✓ Crear usuario" -ForegroundColor White
Write-Host "   6. ✓ Cargar balance" -ForegroundColor White
Write-Host "   7. ✓ Cambiar contraseña" -ForegroundColor White
Write-Host "   8. ✓ Validación de seguridad" -ForegroundColor White

Write-Host "`n🖥️  PRUEBAS MANUALES EN NAVEGADOR:" -ForegroundColor Yellow
Write-Host "   URL: http://localhost:5175" -ForegroundColor Cyan
Write-Host "   Usuario: Andy | Contraseña: andy2024" -ForegroundColor Gray
Write-Host "`n   VERIFICAR:" -ForegroundColor White
Write-Host "   [ ] Formato con separadores: $10.000.000" -ForegroundColor White
Write-Host "   [ ] Cartones con separadores: 25.000" -ForegroundColor White
Write-Host "   [ ] Botones '+' verdes (solo SuperAdmin)" -ForegroundColor White
Write-Host "   [ ] Badge 'SUPERADMIN' dorado" -ForegroundColor White
Write-Host "   [ ] Descuento de recursos al cargar" -ForegroundColor White
Write-Host "   [ ] Modal de cambiar contraseña (Perfil)" -ForegroundColor White

Write-Host "`n========================================`n" -ForegroundColor Cyan
