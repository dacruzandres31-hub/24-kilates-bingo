# ============================================
# TEST: Endpoints de Cantar Línea y BINGO
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SISTEMA DE VALIDACIÓN DE LÍNEAS Y BINGO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$testsPassed = 0
$testsFailed = 0

# Función helper para hacer requests
function Invoke-TestRequest {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Description
    )
    
    Write-Host "[$Method] $Description..." -NoNewline
    
    try {
        $params = @{
            Method = $Method
            Uri = $Url
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-RestMethod @params
        Write-Host " OK" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
        return $null
    }
}

# ============================================
# TEST 1: Login como jugador
# ============================================
Write-Host "`n[TEST 1] Login como jugador de prueba..." -ForegroundColor Yellow

$loginBody = @{
    username = "player1"
    password = "password123"
}

$loginResponse = Invoke-TestRequest `
    -Method "POST" `
    -Url "$baseUrl/api/auth/login" `
    -Body $loginBody `
    -Description "POST /api/auth/login"

if ($loginResponse -and $loginResponse.token) {
    Write-Host "  Token obtenido: $($loginResponse.token.Substring(0,20))..." -ForegroundColor Green
    $token = $loginResponse.token
    $testsPassed++
} else {
    Write-Host "  ERROR: No se pudo hacer login" -ForegroundColor Red
    $testsFailed++
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
}

# ============================================
# TEST 2: Verificar que las tablas existen
# ============================================
Write-Host "`n[TEST 2] Verificando estructura de base de datos..." -ForegroundColor Yellow

$dbCheck = node -e @"
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });
  
  const [tables] = await conn.query(
    \"SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('game_winners', 'game_session_balls')\",
    [process.env.DB_NAME || 'bingo_24k']
  );
  
  console.log(JSON.stringify(tables));
  await conn.end();
})();
"@

if ($dbCheck -match "game_winners" -and $dbCheck -match "game_session_balls") {
    Write-Host "  Tablas game_winners y game_session_balls existen" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "  ERROR: Faltan tablas en la base de datos" -ForegroundColor Red
    $testsFailed++
}

# ============================================
# TEST 3: Crear sesión de juego de prueba
# ============================================
Write-Host "`n[TEST 3] Creando sesión de juego de prueba..." -ForegroundColor Yellow

$createSessionSql = @"
INSERT INTO game_sessions (room, status, current_pot_bingo, current_pot_linea, current_pot_jackpot)
VALUES ('Bronce', 'active', 25000, 2500, 5000)
ON DUPLICATE KEY UPDATE status = 'active'
"@

$sessionId = node -e @"
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });
  
  const [result] = await conn.query(\"$createSessionSql\");
  console.log(result.insertId);
  await conn.end();
})();
"@

if ($sessionId -gt 0) {
    Write-Host "  Sesión creada con ID: $sessionId" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "  ERROR: No se pudo crear sesión" -ForegroundColor Red
    $testsFailed++
}

# ============================================
# TEST 4: Crear cartón de prueba
# ============================================
Write-Host "`n[TEST 4] Creando cartón de prueba..." -ForegroundColor Yellow

$cardNumbers = @(
    @(1,2,3,4,5),
    @(16,17,18,19,20),
    @(31,32,0,34,35),
    @(46,47,48,49,50),
    @(61,62,63,64,65)
)

$cardNumbersJson = ($cardNumbers | ConvertTo-Json -Compress).Replace('"','\"')

$createCardSql = @"
INSERT INTO bingo_cards (user_id, session_id, grid_data, numbers, status, price)
VALUES (
  (SELECT id FROM users WHERE username = 'player1' LIMIT 1),
  $sessionId,
  '{\"B\":[1,16,31,46,61],\"I\":[2,17,32,47,62],\"N\":[3,18,0,48,63],\"G\":[4,19,34,49,64],\"O\":[5,20,35,50,65]}',
  '$cardNumbersJson',
  'active',
  100
)
"@

$cardId = node -e @"
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });
  
  const [result] = await conn.query(\`$createCardSql\`);
  console.log(result.insertId);
  await conn.end();
})();
"@

if ($cardId -gt 0) {
    Write-Host "  Cartón creado con ID: $cardId" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "  ERROR: No se pudo crear cartón" -ForegroundColor Red
    $testsFailed++
}

# ============================================
# TEST 5: Insertar números cantados (primera fila horizontal)
# ============================================
Write-Host "`n[TEST 5] Insertando números cantados..." -ForegroundColor Yellow

$numbersToCall = @(1,2,3,4,5)
$order = 1

foreach ($number in $numbersToCall) {
    $letter = if ($number -le 15) { "B" } 
              elseif ($number -le 30) { "I" }
              elseif ($number -le 45) { "N" }
              elseif ($number -le 60) { "G" }
              else { "O" }
    
    node -e @"
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });
  
  await conn.query(
    'INSERT INTO game_session_balls (game_session_id, ball_number, ball_letter, draw_order) VALUES (?, ?, ?, ?)',
    [$sessionId, $number, '$letter', $order]
  );
  
  await conn.end();
})();
"@ | Out-Null
    
    $order++
}

Write-Host "  Números cantados: $($numbersToCall -join ', ')" -ForegroundColor Green
$testsPassed++

# ============================================
# TEST 6: Cantar línea horizontal
# ============================================
Write-Host "`n[TEST 6] Probando endpoint POST /api/game/claim-line..." -ForegroundColor Yellow

$claimLineBody = @{
    gameSessionId = [int]$sessionId
    cardId = [int]$cardId
    lineType = "horizontal_1"
}

$claimLineResponse = Invoke-TestRequest `
    -Method "POST" `
    -Url "$baseUrl/api/game/claim-line" `
    -Headers $headers `
    -Body $claimLineBody `
    -Description "Cantar línea horizontal_1"

if ($claimLineResponse -and $claimLineResponse.success) {
    Write-Host "  Línea válida - Premio: `$$($claimLineResponse.prizeAmount)" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "  ERROR en validación de línea" -ForegroundColor Red
    $testsFailed++
}

# ============================================
# TEST 7: Verificar que se guardó en game_winners
# ============================================
Write-Host "`n[TEST 7] Verificando registro en game_winners..." -ForegroundColor Yellow

$winnerCheck = node -e @"
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });
  
  const [winners] = await conn.query(
    'SELECT * FROM game_winners WHERE game_session_id = ? AND prize_type = \"linea\"',
    [$sessionId]
  );
  
  console.log(winners.length);
  await conn.end();
})();
"@

if ($winnerCheck -gt 0) {
    Write-Host "  Ganador registrado correctamente en BD" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "  ERROR: No se encontró registro en game_winners" -ForegroundColor Red
    $testsFailed++
}

# ============================================
# RESULTADOS
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESULTADOS FINALES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tests Pasados: $testsPassed" -ForegroundColor Green
Write-Host "Tests Fallidos: $testsFailed" -ForegroundColor Red

if ($testsFailed -eq 0) {
    Write-Host "`n✅ TODOS LOS TESTS PASARON!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ ALGUNOS TESTS FALLARON" -ForegroundColor Red
    exit 1
}
