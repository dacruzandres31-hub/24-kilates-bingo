# Test SuperAdmin - Sistema de Stock con Salas de Regalo

$baseUrl = "http://localhost:3001"
$token = ""

Write-Host "`nTEST: SISTEMA DE STOCK CON REGALO`n" -ForegroundColor Cyan

# 1. Login
Write-Host "[1] Login como SuperAdmin..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body (@{
    username = "Andy"
    password = "Tasso2025"
} | ConvertTo-Json)

$token = $loginResponse.token
Write-Host "OK - Token obtenido`n" -ForegroundColor Green

# 2. Resumen de stock
Write-Host "[2] Consultando resumen de stock..." -ForegroundColor Yellow
$stockSummary = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/summary" -Method GET -Headers @{
    "Authorization" = "Bearer $token"
}

Write-Host "Salas Normales:" -ForegroundColor White
$stockSummary.summary.normal | ForEach-Object {
    Write-Host "  $($_.room): $($_.total_cards) cartones" -ForegroundColor Gray
}

Write-Host "`nSalas de Regalo:" -ForegroundColor Yellow
if ($stockSummary.summary.regalo.Count -eq 0) {
    Write-Host "  (Sin stock)" -ForegroundColor Gray
} else {
    $stockSummary.summary.regalo | ForEach-Object {
        Write-Host "  $($_.room): $($_.total_cards) cartones" -ForegroundColor Gray
    }
}

# 3. Generar BRONCE REGALO
Write-Host "`n[3] Generando 10 cartones de BRONCE REGALO..." -ForegroundColor Yellow
$generateResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/generate" -Method POST -Headers @{
    "Authorization" = "Bearer $token"
} -ContentType "application/json" -Body (@{
    room = "bronce_regalo"
    quantity = 10
    playDate = (Get-Date).ToString("yyyy-MM-dd")
    playTime = "19:00:00"
} | ConvertTo-Json)

Write-Host "OK - $($generateResponse.message)" -ForegroundColor Green

# 4. Generar PLATA REGALO
Write-Host "`n[4] Generando 5 cartones de PLATA REGALO..." -ForegroundColor Yellow
$generateResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/generate" -Method POST -Headers @{
    "Authorization" = "Bearer $token"
} -ContentType "application/json" -Body (@{
    room = "plata_regalo"
    quantity = 5
    playDate = (Get-Date).ToString("yyyy-MM-dd")
    playTime = "20:00:00"
} | ConvertTo-Json)

Write-Host "OK - $($generateResponse.message)" -ForegroundColor Green

# 5. Generar ORO REGALO
Write-Host "`n[5] Generando 3 cartones de ORO REGALO..." -ForegroundColor Yellow
$generateResponse = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/generate" -Method POST -Headers @{
    "Authorization" = "Bearer $token"
} -ContentType "application/json" -Body (@{
    room = "oro_regalo"
    quantity = 3
    playDate = (Get-Date).ToString("yyyy-MM-dd")
    playTime = "21:00:00"
} | ConvertTo-Json)

Write-Host "OK - $($generateResponse.message)" -ForegroundColor Green

# 6. Resumen actualizado
Write-Host "`n[6] Resumen actualizado:" -ForegroundColor Yellow
$stockSummary = Invoke-RestMethod -Uri "$baseUrl/api/superadmin/stock/summary" -Method GET -Headers @{
    "Authorization" = "Bearer $token"
}

$stockSummary.summary.regalo | ForEach-Object {
    Write-Host "  REGALO $($_.room): $($_.total_cards) cartones" -ForegroundColor Green
}

Write-Host "`nTEST COMPLETADO`n" -ForegroundColor Cyan
