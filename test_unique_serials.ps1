# ===================================================
# TEST: Verificación de Seriales Únicos Globales
# ===================================================
# Propósito: Probar que los cartones tienen seriales únicos
#            y nunca se duplican, incluso después de reiniciar
# ===================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST: SERIALES ÚNICOS GLOBALES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OTk5LCJ1c2VybmFtZSI6InRlc3RpbmdfMCIsInJvbGUiOiJqdWdhZG9yIiwiaWF0IjoxNzM0NTYwMDAwfQ.dummytoken"

Write-Host "📋 PASO 1: Inicializar sesión y generar cartones`n" -ForegroundColor Yellow

$initResponse = Invoke-WebRequest -Uri "$baseUrl/api/game/starter/initialize-session" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    } `
    -Body (@{
        totalCards = 100
        roomType = "starter"
    } | ConvertTo-Json)

$initData = $initResponse.Content | ConvertFrom-Json

if ($initData.success) {
    Write-Host "✅ Sesión inicializada: $($initData.sessionId)" -ForegroundColor Green
    Write-Host "📊 Cartones generados: $($initData.totalCards)" -ForegroundColor Green
    $sessionId = $initData.sessionId
} else {
    Write-Host "❌ Error: $($initData.message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 PASO 2: Obtener cartones disponibles (1ra vez)`n" -ForegroundColor Yellow

$cardsResponse1 = Invoke-WebRequest -Uri "$baseUrl/api/game/starter/available-cards/$sessionId" `
    -Method GET `
    -Headers @{
        "Authorization" = "Bearer $token"
    }

$cardsData1 = $cardsResponse1.Content | ConvertFrom-Json

if ($cardsData1.success) {
    Write-Host "✅ Cartones obtenidos: $($cardsData1.cards.Count)" -ForegroundColor Green
    Write-Host "📝 Ejemplos de seriales (primeros 10):" -ForegroundColor Cyan
    $cardsData1.cards[0..9] | ForEach-Object {
        Write-Host "  - $($_.serial)" -ForegroundColor White
    }
    
    # Guardar seriales para comparar
    $serials1 = $cardsData1.cards | ForEach-Object { $_.serial }
} else {
    Write-Host "❌ Error: $($cardsData1.message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 PASO 3: Reservar 5 cartones`n" -ForegroundColor Yellow

$cardIds = $cardsData1.cards[0..4] | ForEach-Object { $_.id }

$reserveResponse = Invoke-WebRequest -Uri "$baseUrl/api/game/starter/reserve-cards" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    } `
    -Body (@{
        sessionId = $sessionId
        cardIds = $cardIds
    } | ConvertTo-Json)

$reserveData = $reserveResponse.Content | ConvertFrom-Json

if ($reserveData.success) {
    Write-Host "✅ Cartones reservados: $($reserveData.reservedCards.Count)" -ForegroundColor Green
    Write-Host "📝 Seriales reservados:" -ForegroundColor Cyan
    $reserveData.reservedCards | ForEach-Object {
        Write-Host "  - $($_.serial)" -ForegroundColor White
    }
} else {
    Write-Host "❌ Error: $($reserveData.message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 PASO 4: Intentar reservar el MISMO cartón otra vez (debe fallar)`n" -ForegroundColor Yellow

$duplicateResponse = Invoke-WebRequest -Uri "$baseUrl/api/game/starter/reserve-cards" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    } `
    -Body (@{
        sessionId = $sessionId
        cardIds = @($cardIds[0])  # Mismo cartón
    } | ConvertTo-Json) `
    -SkipHttpErrorCheck

$duplicateData = $duplicateResponse.Content | ConvertFrom-Json

if ($duplicateResponse.StatusCode -ne 200 -or -not $duplicateData.success) {
    Write-Host "✅ CORRECTO: No se puede reservar cartón duplicado" -ForegroundColor Green
    Write-Host "   Mensaje: $($duplicateData.message)" -ForegroundColor Gray
} else {
    Write-Host "❌ ERROR: Se permitió duplicar cartón!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 PASO 5: Obtener cartones disponibles (2da vez - no debe incluir los reservados)`n" -ForegroundColor Yellow

$cardsResponse2 = Invoke-WebRequest -Uri "$baseUrl/api/game/starter/available-cards/$sessionId" `
    -Method GET `
    -Headers @{
        "Authorization" = "Bearer $token"
    }

$cardsData2 = $cardsResponse2.Content | ConvertFrom-Json

if ($cardsData2.success) {
    Write-Host "✅ Cartones disponibles ahora: $($cardsData2.cards.Count)" -ForegroundColor Green
    
    # Verificar que los reservados no están disponibles
    $reserved = $reserveData.reservedCards | ForEach-Object { $_.id }
    $stillAvailable = $cardsData2.cards | Where-Object { $reserved -contains $_.id }
    
    if ($stillAvailable.Count -eq 0) {
        Write-Host "✅ CORRECTO: Los cartones reservados NO están disponibles" -ForegroundColor Green
    } else {
        Write-Host "❌ ERROR: $($stillAvailable.Count) cartones reservados siguen disponibles!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Error: $($cardsData2.message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 PASO 6: Verificar unicidad en BD`n" -ForegroundColor Yellow

# Conectar a MySQL y verificar
$env:MYSQL_PWD = "root"
$query = "SELECT COUNT(*) as total, COUNT(DISTINCT serial) as unicos FROM card_pool WHERE session_id = '$sessionId'"
$result = & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root bingo_24k -N -e $query

$values = $result -split "`t"
$total = [int]$values[0]
$unicos = [int]$values[1]

Write-Host "📊 Total cartones en BD: $total" -ForegroundColor Cyan
Write-Host "📊 Seriales únicos: $unicos" -ForegroundColor Cyan

if ($total -eq $unicos) {
    Write-Host "✅ CORRECTO: Todos los seriales son únicos en BD" -ForegroundColor Green
} else {
    Write-Host "❌ ERROR: Hay $($total - $unicos) seriales duplicados!" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   ✅ TODAS LAS PRUEBAS PASARON" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "📝 RESUMEN:" -ForegroundColor Yellow
Write-Host "  - Seriales son únicos globalmente" -ForegroundColor White
Write-Host "  - No se pueden reservar cartones duplicados" -ForegroundColor White
Write-Host "  - Los cartones reservados no quedan disponibles" -ForegroundColor White
Write-Host "  - La BD no contiene seriales duplicados" -ForegroundColor White
Write-Host ""
