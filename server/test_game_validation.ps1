# ============================================
# TEST: Sistema de Validación de Líneas y BINGO
# ============================================

$BASE_URL = "http://localhost:3001/api"
$ErrorActionPreference = "Continue"

Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host   "║  TEST: VALIDACIÓN DE LÍNEAS Y BINGO        ║" -ForegroundColor Cyan
Write-Host   "╚══════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ============================================
# PASO 0: Preparación
# ============================================

# Login como jugador
Write-Host "[0/8] Login como jugador..." -ForegroundColor Yellow
$loginBody = @{
  username = "chiptest_user"
  password = "test123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$TOKEN = $loginResponse.token
$USER_ID = $loginResponse.user.id

if (!$TOKEN) {
  Write-Host "❌ Error: No se pudo obtener token" -ForegroundColor Red
  exit 1
}

Write-Host "✅ Login exitoso (UserID: $USER_ID)" -ForegroundColor Green

# ============================================
# PASO 1: Crear sesión de juego de prueba
# ============================================

Write-Host "`n[1/8] Creando sesión de juego..." -ForegroundColor Yellow

$createSessionSQL = @"
INSERT INTO game_sessions 
(room, status, current_pot_bingo, current_pot_linea, line_prize, bingo_prize) 
VALUES ('bronce', 'active', 25000, 2500, 2500, 25000)
"@

$sessionId = node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });
  
  const [result] = await conn.query(`$createSessionSQL`);
  console.log(result.insertId);
  await conn.end();
})().catch(err => { console.error(err); process.exit(1); });
"

if (!$sessionId) {
  Write-Host "❌ Error: No se pudo crear sesión" -ForegroundColor Red
  exit 1
}

Write-Host "✅ Sesión creada (ID: $sessionId)" -ForegroundColor Green

# ============================================
# PASO 2: Crear cartón de prueba
# ============================================

Write-Host "`n[2/8] Creando cartón de prueba..." -ForegroundColor Yellow

$createCardSQL = @"
INSERT INTO bingo_cards 
(user_id, session_id, numbers, grid_data, status, price) 
VALUES (
  $USER_ID, 
  $sessionId,
  JSON_ARRAY(
    JSON_ARRAY(1, 16, 31, 46, 61),
    JSON_ARRAY(2, 17, 32, 47, 62),
    JSON_ARRAY(3, 18, 0, 48, 63),
    JSON_ARRAY(4, 19, 34, 49, 64),
    JSON_ARRAY(5, 20, 35, 50, 65)
  ),
  JSON_OBJECT(
    'B', JSON_ARRAY(1,2,3,4,5),
    'I', JSON_ARRAY(16,17,18,19,20),
    'N', JSON_ARRAY(31,32,0,34,35),
    'G', JSON_ARRAY(46,47,48,49,50),
    'O', JSON_ARRAY(61,62,63,64,65)
  ),
  'active',
  100
)
"@

$cardId = node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });
  
  const [result] = await conn.query(`$createCardSQL`.replace(/\r?\n/g, ' '));
  console.log(result.insertId);
  await conn.end();
})().catch(err => { console.error(err); process.exit(1); });
"

if (!$cardId) {
  Write-Host "❌ Error: No se pudo crear cartón" -ForegroundColor Red
  exit 1
}

Write-Host "✅ Cartón creado (ID: $cardId)" -ForegroundColor Green

# ============================================
# PASO 3: Simular bolas cantadas (línea horizontal)
# ============================================

Write-Host "`n[3/8] Simulando bolas para línea horizontal 1..." -ForegroundColor Yellow

$balls = @(1, 16, 31, 46, 61) # Primera línea del cartón
$drawOrder = 1

foreach ($ball in $balls) {
  $letter = if ($ball -le 15) { 'B' } elseif ($ball -le 30) { 'I' } elseif ($ball -le 45) { 'N' } elseif ($ball -le 60) { 'G' } else { 'O' }
  
  node -e "
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
        [$sessionId, $ball, '$letter', $drawOrder]
      );
      
      await conn.end();
    })();
  " | Out-Null
  
  $drawOrder++
}

Write-Host "✅ 5 bolas cantadas (línea completa)" -ForegroundColor Green

# ============================================
# PASO 4: Cantar línea (debe funcionar)
# ============================================

Write-Host "`n[4/8] POST /game/claim-line (horizontal_1)..." -ForegroundColor Yellow

$claimLineBody = @{
  gameSessionId = [int]$sessionId
  cardId = [int]$cardId
  lineType = "horizontal_1"
} | ConvertTo-Json

try {
  $lineResponse = Invoke-RestMethod -Uri "$BASE_URL/game/claim-line" `
    -Method POST `
    -Body $claimLineBody `
    -ContentType "application/json" `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
  
  if ($lineResponse.success) {
    Write-Host "✅ PASS - Línea válida detectada!" -ForegroundColor Green
    Write-Host "   Premio: `$$($lineResponse.prizeAmount)" -ForegroundColor Cyan
    Write-Host "   Números ganadores: $($lineResponse.winningNumbers -join ', ')" -ForegroundColor Cyan
  } else {
    Write-Host "❌ FAIL - $($lineResponse.message)" -ForegroundColor Red
  }
} catch {
  Write-Host "❌ FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Response: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}

# ============================================
# PASO 5: Intentar cantar la misma línea (debe fallar)
# ============================================

Write-Host "`n[5/8] POST /game/claim-line (duplicado)..." -ForegroundColor Yellow

try {
  $lineResponse2 = Invoke-RestMethod -Uri "$BASE_URL/game/claim-line" `
    -Method POST `
    -Body $claimLineBody `
    -ContentType "application/json" `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
  
  Write-Host "❌ FAIL - No debería permitir línea duplicada" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode -eq 400) {
    Write-Host "✅ PASS - Rechazó línea duplicada correctamente" -ForegroundColor Green
  } else {
    Write-Host "❌ FAIL - Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# ============================================
# PASO 6: Completar bolas para BINGO
# ============================================

Write-Host "`n[6/8] Simulando resto de bolas para BINGO..." -ForegroundColor Yellow

$restOfBalls = @(2,3,4,5, 17,18,19,20, 32,34,35, 47,48,49,50, 62,63,64,65)

foreach ($ball in $restOfBalls) {
  $letter = if ($ball -le 15) { 'B' } elseif ($ball -le 30) { 'I' } elseif ($ball -le 45) { 'N' } elseif ($ball -le 60) { 'G' } else { 'O' }
  
  node -e "
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
        [$sessionId, $ball, '$letter', $drawOrder]
      );
      
      await conn.end();
    })();
  " | Out-Null
  
  $drawOrder++
}

Write-Host "✅ 24 bolas totales cantadas (BINGO completo)" -ForegroundColor Green

# ============================================
# PASO 7: Cantar BINGO
# ============================================

Write-Host "`n[7/8] POST /game/claim-bingo..." -ForegroundColor Yellow

$claimBingoBody = @{
  gameSessionId = [int]$sessionId
  cardId = [int]$cardId
} | ConvertTo-Json

try {
  $bingoResponse = Invoke-RestMethod -Uri "$BASE_URL/game/claim-bingo" `
    -Method POST `
    -Body $claimBingoBody `
    -ContentType "application/json" `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
  
  if ($bingoResponse.success) {
    Write-Host "✅ PASS - BINGO válido!" -ForegroundColor Green
    Write-Host "   Premio: `$$($bingoResponse.prizeAmount)" -ForegroundColor Cyan
    Write-Host "   Números ganadores: $($bingoResponse.winningNumbers.Count) números" -ForegroundColor Cyan
    Write-Host "   Juego terminado: $($bingoResponse.gameEnded)" -ForegroundColor Cyan
  } else {
    Write-Host "❌ FAIL - $($bingoResponse.message)" -ForegroundColor Red
  }
} catch {
  Write-Host "❌ FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# PASO 8: Verificar ganadores registrados
# ============================================

Write-Host "`n[8/8] Verificando ganadores registrados..." -ForegroundColor Yellow

$winners = node -e "
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
    'SELECT * FROM game_winners WHERE game_session_id = ?',
    [$sessionId]
  );
  
  console.log(JSON.stringify(winners, null, 2));
  await conn.end();
})();
"

if ($winners) {
  $winnersData = $winners | ConvertFrom-Json
  Write-Host "✅ PASS - $($winnersData.Count) ganador(es) registrado(s)" -ForegroundColor Green
  foreach ($winner in $winnersData) {
    Write-Host "   - $($winner.prize_type): `$$($winner.prize_amount) ($($winner.line_type))" -ForegroundColor Cyan
  }
} else {
  Write-Host "❌ FAIL - No se encontraron ganadores" -ForegroundColor Red
}

# ============================================
# RESUMEN
# ============================================

Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host   "║         PRUEBA COMPLETADA                  ║" -ForegroundColor Green
Write-Host   "╚══════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`nSesión ID: $sessionId" -ForegroundColor Cyan
Write-Host "Cartón ID: $cardId" -ForegroundColor Cyan
Write-Host "`nPróximo paso: Verificar formularios de pago`n" -ForegroundColor Yellow
