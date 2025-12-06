# ============================================
# TEST: Sistema de Validación de Líneas y BINGO (Simplificado)
# ============================================

$BASE_URL = "http://localhost:3001/api"
$ErrorActionPreference = "Continue"

Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host   "║  TEST: VALIDACIÓN DE LÍNEAS Y BINGO        ║" -ForegroundColor Cyan
Write-Host   "╚══════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Login
Write-Host "[0/5] Login..." -ForegroundColor Yellow
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

# Preparar datos de prueba usando archivo SQL separado
Write-Host "`n[1/5] Preparando datos de prueba..." -ForegroundColor Yellow

$setupScript = @"
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });
  
  // Crear sesión
  const [session] = await conn.query(
    'INSERT INTO game_sessions (room, status, current_pot_bingo, current_pot_linea) VALUES (?, ?, ?, ?)',
    ['bronce', 'active', 25000, 2500]
  );
  const sessionId = session.insertId;
  
  // Crear cartón con números para línea horizontal 1: 1,16,31,46,61
  const cardNumbers = [
    [1, 16, 31, 46, 61],
    [2, 17, 32, 47, 62],
    [3, 18, 0, 48, 63],
    [4, 19, 34, 49, 64],
    [5, 20, 35, 50, 65]
  ];
  
  const gridData = {
    B: [1,2,3,4,5],
    I: [16,17,18,19,20],
    N: [31,32,0,34,35],
    G: [46,47,48,49,50],
    O: [61,62,63,64,65]
  };
  
  const [card] = await conn.query(
    'INSERT INTO bingo_cards (user_id, session_id, numbers, grid_data, status, price) VALUES (?, ?, ?, ?, ?, ?)',
    [$USER_ID, sessionId, JSON.stringify(cardNumbers), JSON.stringify(gridData), 'active', 100]
  );
  const cardId = card.insertId;
  
  // Cantar bolas para línea horizontal 1
  const balls = [
    [1, 'B', 1], [16, 'I', 2], [31, 'N', 3], [46, 'G', 4], [61, 'O', 5]
  ];
  
  for (const [num, letter, order] of balls) {
    await conn.query(
      'INSERT INTO game_session_balls (game_session_id, ball_number, ball_letter, draw_order) VALUES (?, ?, ?, ?)',
      [sessionId, num, letter, order]
    );
  }
  
  console.log(JSON.stringify({ sessionId, cardId }));
  await conn.end();
})();
"@

$tempFile = "temp_setup_$((Get-Random)).js"
$setupScript | Out-File -FilePath $tempFile -Encoding UTF8

$setupResult = node $tempFile 2>$null
Remove-Item $tempFile -Force

if (!$setupResult) {
  Write-Host "❌ Error: No se pudieron crear datos de prueba" -ForegroundColor Red
  exit 1
}

$testData = $setupResult | ConvertFrom-Json
$sessionId = $testData.sessionId
$cardId = $testData.cardId

Write-Host "✅ Sesión: $sessionId, Cartón: $cardId" -ForegroundColor Green

# Test 1: Cantar línea válida
Write-Host "`n[2/5] POST /game/claim-line (horizontal_1)..." -ForegroundColor Yellow

$claimLineBody = @{
  gameSessionId = $sessionId
  cardId = $cardId
  lineType = "horizontal_1"
} | ConvertTo-Json

try {
  $lineResponse = Invoke-RestMethod -Uri "$BASE_URL/game/claim-line" `
    -Method POST `
    -Body $claimLineBody `
    -ContentType "application/json" `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
  
  if ($lineResponse.success) {
    Write-Host "✅ PASS - Línea válida: $($lineResponse.prizeAmount)" -ForegroundColor Green
  } else {
    Write-Host "❌ FAIL - $($lineResponse.message)" -ForegroundColor Red
  }
} catch {
  $errMsg = $_.ErrorDetails.Message | ConvertFrom-Json
  Write-Host "❌ FAIL - $($errMsg.message)" -ForegroundColor Red
}

# Test 2: Cantar línea duplicada
Write-Host "`n[3/5] POST /game/claim-line (duplicado)..." -ForegroundColor Yellow

try {
  $lineResponse2 = Invoke-RestMethod -Uri "$BASE_URL/game/claim-line" `
    -Method POST `
    -Body $claimLineBody `
    -ContentType "application/json" `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
  
  Write-Host "❌ FAIL - No debería permitir duplicado" -ForegroundColor Red
} catch {
  Write-Host "✅ PASS - Rechazó línea duplicada" -ForegroundColor Green
}

# Test 3: Agregar más bolas para BINGO completo
Write-Host "`n[4/5] Agregando bolas para BINGO..." -ForegroundColor Yellow

$addBallsScript = @"
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });
  
  const balls = [
    [2,'B',6], [3,'B',7], [4,'B',8], [5,'B',9],
    [17,'I',10], [18,'I',11], [19,'I',12], [20,'I',13],
    [32,'N',14], [34,'N',15], [35,'N',16],
    [47,'G',17], [48,'G',18], [49,'G',19], [50,'G',20],
    [62,'O',21], [63,'O',22], [64,'O',23], [65,'O',24]
  ];
  
  for (const [num, letter, order] of balls) {
    await conn.query(
      'INSERT INTO game_session_balls (game_session_id, ball_number, ball_letter, draw_order) VALUES (?, ?, ?, ?)',
      [$sessionId, num, letter, order]
    );
  }
  
  console.log('OK');
  await conn.end();
})();
"@

$tempFile2 = "temp_balls_$((Get-Random)).js"
$addBallsScript | Out-File -FilePath $tempFile2 -Encoding UTF8
$ballResult = node $tempFile2 2>$null
Remove-Item $tempFile2 -Force

Write-Host "✅ 24 bolas cantadas (BINGO completo)" -ForegroundColor Green

# Test 4: Cantar BINGO
Write-Host "`n[5/5] POST /game/claim-bingo..." -ForegroundColor Yellow

$claimBingoBody = @{
  gameSessionId = $sessionId
  cardId = $cardId
} | ConvertTo-Json

try {
  $bingoResponse = Invoke-RestMethod -Uri "$BASE_URL/game/claim-bingo" `
    -Method POST `
    -Body $claimBingoBody `
    -ContentType "application/json" `
    -Headers @{ "Authorization" = "Bearer $TOKEN" }
  
  if ($bingoResponse.success) {
    Write-Host "✅ PASS - BINGO válido: $($bingoResponse.prizeAmount)" -ForegroundColor Green
  } else {
    Write-Host "❌ FAIL - $($bingoResponse.message)" -ForegroundColor Red
  }
} catch {
  $errMsg = $_.ErrorDetails.Message | ConvertFrom-Json
  Write-Host "❌ FAIL - $($errMsg.message)" -ForegroundColor Red
}

Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host   "║         PRUEBA COMPLETADA                  ║" -ForegroundColor Green
Write-Host   "╚══════════════════════════════════════════════╝`n" -ForegroundColor Green
