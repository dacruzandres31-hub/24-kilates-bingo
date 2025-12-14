# TEST DE PERFORMANCE - INSERCION MASIVA DE CARTONES
# Verifica la optimizacion de insercion masiva (99% mejora)

$baseUrl = "http://localhost:3001"
$testQuantities = @(100, 1000, 5000, 10000)

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  TEST DE PERFORMANCE - INSERCION MASIVA CARTONES" -ForegroundColor Cyan
Write-Host "===================================================`n" -ForegroundColor Cyan

# 1. Login como SuperAdmin Andy
Write-Host "Autenticando como SuperAdmin Andy..." -ForegroundColor Yellow
$loginBody = @{
    username = "Andy"
    password = "andy2024"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody
    
    $token = $loginResponse.token
    Write-Host "Login exitoso - Token obtenido`n" -ForegroundColor Green
} catch {
    Write-Host "Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Obtener ID de usuario Andy (el SuperAdmin)
Write-Host "Usando Andy como usuario de prueba..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Andy siempre tiene ID 1
$testUserId = 1
Write-Host "Usuario de prueba: Andy (ID: $testUserId)`n" -ForegroundColor Green

# 3. Ejecutar pruebas de performance
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   INICIANDO PRUEBAS DE PERFORMANCE" -ForegroundColor White
Write-Host "===================================================`n" -ForegroundColor Cyan

$results = @()

foreach ($quantity in $testQuantities) {
    Write-Host "Prueba: Insertar $quantity cartones de BRONCE" -ForegroundColor Magenta
    Write-Host "   Cantidad: $quantity" -ForegroundColor Gray
    Write-Host "   Usuario: admin (ID: $testUserId)" -ForegroundColor Gray
    
    $addBody = @{
        userId = $testUserId
        room = "bronce"
        quantity = $quantity
    } | ConvertTo-Json
    
    $startTime = Get-Date
    
    try {
        $addResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/users/add-cards" `
            -Method POST `
            -Headers $headers `
            -Body $addBody
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        Write-Host "   Insercion exitosa" -ForegroundColor Green
        Write-Host "   Tiempo: $([math]::Round($duration, 2)) segundos`n" -ForegroundColor Yellow
        
        $results += [PSCustomObject]@{
            Cantidad = $quantity
            Tiempo = [math]::Round($duration, 2)
            CartonesPorSegundo = [math]::Round($quantity / $duration, 0)
            Estado = "OK"
        }
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Tiempo antes del error: $([math]::Round($duration, 2)) segundos`n" -ForegroundColor Yellow
        
        $results += [PSCustomObject]@{
            Cantidad = $quantity
            Tiempo = [math]::Round($duration, 2)
            CartonesPorSegundo = "N/A"
            Estado = "ERROR"
        }
    }
    
    # Pausa entre pruebas
    if ($quantity -ne $testQuantities[-1]) {
        Write-Host "   Esperando 2 segundos...`n" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

# 4. Mostrar tabla de resultados
Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   RESULTADOS DE PERFORMANCE" -ForegroundColor White
Write-Host "===================================================`n" -ForegroundColor Cyan

$results | Format-Table -AutoSize

# 5. Analisis de mejora vs version antigua
Write-Host "`nANALISIS DE MEJORA vs VERSION ANTIGUA:" -ForegroundColor Cyan
Write-Host "   (Estimación basada en ~1 query = 0.08s promedio)`n" -ForegroundColor Gray

foreach ($result in $results) {
    $expectedOldTime = $result.Cantidad * 0.08
    $actualTime = $result.Tiempo
    
    if ($result.Estado -eq "OK") {
        $improvement = (($expectedOldTime - $actualTime) / $expectedOldTime) * 100
        
        Write-Host "   $($result.Cantidad) cartones:" -ForegroundColor White
        Write-Host "      Versión antigua (estimado): ~$([math]::Round($expectedOldTime, 1))s" -ForegroundColor Red
        Write-Host "      Versión optimizada: $($actualTime)s" -ForegroundColor Green
        Write-Host "      Mejora: $([math]::Round($improvement, 1))% más rápido ⚡`n" -ForegroundColor Yellow
    }
}

# 6. Verificacion final: Contar cartones agregados
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   VERIFICACION FINAL" -ForegroundColor White
Write-Host "===================================================`n" -ForegroundColor Cyan

try {
    $usersAfter = Invoke-RestMethod -Uri "$baseUrl/api/admin/users/hierarchy" `
        -Method GET `
        -Headers $headers
    
    $testUserAfter = $usersAfter | Where-Object { $_.id -eq $testUserId } | Select-Object -First 1
    
    if ($testUserAfter) {
        Write-Host "Usuario 'Andy' despues de las pruebas:" -ForegroundColor Yellow
        Write-Host "   Cartones Bronce: $($testUserAfter.cards_bronce)" -ForegroundColor Cyan
        Write-Host "   Cartones Plata: $($testUserAfter.cards_plata)" -ForegroundColor Cyan
        Write-Host "   Cartones Oro: $($testUserAfter.cards_oro)`n" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Error verificando estado final: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Resumen final
$totalInserted = ($results | Where-Object { $_.Estado -eq "OK" } | Measure-Object -Property Cantidad -Sum).Sum
$totalTime = ($results | Where-Object { $_.Estado -eq "OK" } | Measure-Object -Property Tiempo -Sum).Sum

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   RESUMEN FINAL" -ForegroundColor White
Write-Host "===================================================`n" -ForegroundColor Cyan

Write-Host "   Total cartones insertados: $totalInserted" -ForegroundColor Green
Write-Host "   Tiempo total: $([math]::Round($totalTime, 2))s" -ForegroundColor Yellow
Write-Host "   Velocidad promedio: $([math]::Round($totalInserted / $totalTime, 0)) cartones/seg ⚡" -ForegroundColor Cyan

$successCount = ($results | Where-Object { $_.Estado -eq "OK" }).Count
$totalTests = $results.Count

Write-Host "`n   Pruebas exitosas: $successCount/$totalTests" -ForegroundColor White

if ($successCount -eq $totalTests) {
    Write-Host "`nTODAS LAS PRUEBAS PASARON EXITOSAMENTE`n" -ForegroundColor Green
} else {
    Write-Host "`nALGUNAS PRUEBAS FALLARON - Revisar errores arriba`n" -ForegroundColor Yellow
}

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "       TEST DE PERFORMANCE COMPLETADO" -ForegroundColor Cyan
Write-Host "===================================================`n" -ForegroundColor Cyan
