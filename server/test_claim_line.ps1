# ============================================
# TEST SIMPLIFICADO: Líneas y BINGO
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SISTEMA DE VALIDACIÓN" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"

# Test 1: Login
Write-Host "[1/4] Login..." -NoNewline
try {
    $loginBody = @{
        username = "player1"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/auth/login" -Body $loginBody -ContentType "application/json"
    $token = $response.token
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Token: $($token.Substring(0,20))..." -ForegroundColor Gray
}
catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Yellow
    exit 1
}

# Test 2: Verificar tablas
Write-Host "[2/4] Verificando BD..." -NoNewline
node check_tables.js | Out-Null
Write-Host " OK" -ForegroundColor Green

# Test 3: Crear datos de prueba
Write-Host "[3/4] Creando datos de prueba..." -NoNewline

# Crear archivo SQL temporal
$testDataSql = @"
-- Crear sesión activa
INSERT INTO game_sessions (room, status, current_pot_bingo, current_pot_linea) 
VALUES ('Bronce', 'active', 25000, 2500);
SET @session_id = LAST_INSERT_ID();

-- Crear cartón
INSERT INTO bingo_cards (user_id, session_id, numbers, grid_data, status, price)
SELECT 
    u.id,
    @session_id,
    '[[1,2,3,4,5],[16,17,18,19,20],[31,32,0,34,35],[46,47,48,49,50],[61,62,63,64,65]]',
    '{"B":[1,16,31,46,61],"I":[2,17,18,19,47,62],"N":[3,18,0,48,63],"G":[4,19,34,49,64],"O":[5,20,35,50,65]}',
    'active',
    100
FROM users u WHERE u.username = 'player1' LIMIT 1;
SET @card_id = LAST_INSERT_ID();

-- Insertar números cantados (primera fila)
INSERT INTO game_session_balls (game_session_id, ball_number, ball_letter, draw_order)
VALUES 
    (@session_id, 1, 'B', 1),
    (@session_id, 2, 'I', 2),
    (@session_id, 3, 'N', 3),
    (@session_id, 4, 'G', 4),
    (@session_id, 5, 'O', 5);

SELECT @session_id as session_id, @card_id as card_id;
"@

$testDataSql | Out-File -FilePath "test_data_temp.sql" -Encoding UTF8

# Ejecutar SQL y capturar IDs
$result = mysql -h localhost -u root bingo_24k < test_data_temp.sql 2>&1 | Select-Object -Last 2

if ($result -match "(\d+)") {
    Write-Host " OK" -ForegroundColor Green
    
    # Obtener session_id y card_id
    $ids = mysql -h localhost -u root -e "SELECT MAX(id) as sid FROM game_sessions; SELECT MAX(id) as cid FROM bingo_cards;" bingo_24k 2>&1
    $sessionId = ($ids | Select-String -Pattern "sid\s+(\d+)").Matches.Groups[1].Value
    $cardId = ($ids | Select-String -Pattern "cid\s+(\d+)").Matches.Groups[1].Value
    
    Write-Host "  Session ID: $sessionId" -ForegroundColor Gray
    Write-Host "  Card ID: $cardId" -ForegroundColor Gray
}
else {
    Write-Host " FAIL" -ForegroundColor Red
    exit 1
}

# Test 4: Cantar línea
Write-Host "[4/4] POST /api/game/claim-line..." -NoNewline

$headers = @{
    "Authorization" = "Bearer $token"
}

$claimBody = @{
    gameSessionId = [int]$sessionId
    cardId = [int]$cardId
    lineType = "horizontal_1"
} | ConvertTo-Json

try {
    $claimResponse = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/game/claim-line" -Headers $headers -Body $claimBody -ContentType "application/json"
    
    if ($claimResponse.success) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "  Premio: `$$($claimResponse.prizeAmount)" -ForegroundColor Gray
        Write-Host "  Line Type: $($claimResponse.lineType)" -ForegroundColor Gray
    }
    else {
        Write-Host " FAIL" -ForegroundColor Red
        Write-Host "  $($claimResponse.message)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.ErrorDetails) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# Cleanup
Remove-Item test_data_temp.sql -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ TEST COMPLETADO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
