Write-Host "`n========================================"
Write-Host "   TEST: SERIALES ÚNICOS GLOBALES"
Write-Host "========================================`n"

$baseUrl = "http://localhost:3001"

Write-Host "PASO 1: Inicializar sesion`n"

try {
    $initBody = @{
        totalCards = 100
        roomType = "starter"
    } | ConvertTo-Json

    $initResponse = Invoke-RestMethod -Uri "$baseUrl/api/game/starter/initialize-session" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
        } `
        -Body $initBody

    Write-Host "Sesion inicializada: $($initResponse.sessionId)"
    Write-Host "Cartones generados: $($initResponse.totalCards)"
    $sessionId = $initResponse.sessionId
}
catch {
    Write-Host "Error: $_"
    exit 1
}

Write-Host "`nPASO 2: Obtener cartones disponibles`n"

try {
    $cardsResponse = Invoke-RestMethod -Uri "$baseUrl/api/game/starter/available-cards/$sessionId" -Method GET

    Write-Host "Cartones obtenidos: $($cardsResponse.cards.Count)"
    Write-Host "Ejemplos de seriales (primeros 10):"
    $cardsResponse.cards[0..9] | ForEach-Object {
        Write-Host "  - $($_.serial)"
    }
}
catch {
    Write-Host "Error: $_"
    exit 1
}

Write-Host "`nPASO 3: Reservar 5 cartones`n"

try {
    $cardIds = $cardsResponse.cards[0..4] | ForEach-Object { $_.id }
    
    $reserveBody = @{
        sessionId = $sessionId
        cardIds = $cardIds
    } | ConvertTo-Json

    $reserveResponse = Invoke-RestMethod -Uri "$baseUrl/api/game/starter/reserve-cards" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
        } `
        -Body $reserveBody

    Write-Host "Cartones reservados: $($reserveResponse.reservedCards.Count)"
    Write-Host "Seriales reservados:"
    $reserveResponse.reservedCards | ForEach-Object {
        Write-Host "  - $($_.serial)"
    }
}
catch {
    Write-Host "Error: $_"
    exit 1
}

Write-Host "`nPASO 4: Intentar reservar el MISMO carton (debe fallar)`n"

try {
    $dupBody = @{
        sessionId = $sessionId
        cardIds = @($cardIds[0])
    } | ConvertTo-Json

    $dupResponse = Invoke-RestMethod -Uri "$baseUrl/api/game/starter/reserve-cards" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
        } `
        -Body $dupBody

    Write-Host "ERROR: Se permitio duplicar carton!"
    exit 1
}
catch {
    Write-Host "CORRECTO: No se puede reservar carton duplicado"
}

Write-Host "`nPASO 5: Verificar unicidad en BD`n"

$env:MYSQL_PWD = "root"
$query = "SELECT COUNT(*) as total, COUNT(DISTINCT serial) as unicos FROM card_pool WHERE session_id = '$sessionId'"
$result = & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root bingo_24k -N -e $query

$values = $result -split "`t"
$total = [int]$values[0]
$unicos = [int]$values[1]

Write-Host "Total cartones en BD: $total"
Write-Host "Seriales unicos: $unicos"

if ($total -eq $unicos) {
    Write-Host "`nTODAS LAS PRUEBAS PASARON"
}
else {
    Write-Host "`nERROR: Hay $($total - $unicos) seriales duplicados!"
    exit 1
}
