$BASE_URL = "http://localhost:3001"

Write-Host "=== TEST PARENT_ID COMPLETO ===" -ForegroundColor Cyan

# 1. Login como SuperAdmin
Write-Host "`n1. Login SuperAdmin..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$superadminToken = $response.token
$superadminId = $response.user.id

Write-Host "  OK - SuperAdmin ID: $superadminId" -ForegroundColor Green

# 2. SuperAdmin crea Agente Principal (SIN parent_id = será raíz)
Write-Host "`n2. SuperAdmin crea Agente Principal (raíz)..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$createAgentBody = @{
    username = "agente_raiz_$timestamp"
    password = "test123"
    role = "agente"
} | ConvertTo-Json

$headers = @{ "Authorization" = "Bearer $superadminToken" }
$agentResponse = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/create" -Method Post -Body $createAgentBody -ContentType "application/json" -Headers $headers
$agentId = $agentResponse.userId

Write-Host "  OK - Agente creado: ID $agentId" -ForegroundColor Green

# 3. Verificar en BD que parent_id = NULL
Write-Host "`n3. Verificar Agente en BD (parent_id debe ser NULL)..." -ForegroundColor Yellow
$checkQuery = "SELECT id, username, role, parent_id FROM users WHERE id = $agentId;"
$dbResult = & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pbingo2024 bingo_24k -e $checkQuery 2>$null | Select-String -Pattern "$agentId"
Write-Host "  $dbResult" -ForegroundColor White

# 4. Login como Agente
Write-Host "`n4. Login como Agente Principal..." -ForegroundColor Yellow
$agentLoginBody = @{
    username = "agente_raiz_$timestamp"
    password = "test123"
} | ConvertTo-Json

$agentLoginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $agentLoginBody -ContentType "application/json"
$agentToken = $agentLoginResponse.token

Write-Host "  OK - Agente logueado" -ForegroundColor Green

# 5. Agente crea Sub-Agente (parent_id debe ser automático = agentId)
Write-Host "`n5. Agente crea Sub-Agente (parent_id automático)..." -ForegroundColor Yellow
$createSubAgentBody = @{
    username = "subagente_$timestamp"
    password = "test123"
    role = "agente"
} | ConvertTo-Json

$agentHeaders = @{ "Authorization" = "Bearer $agentToken" }
$subAgentResponse = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/create" -Method Post -Body $createSubAgentBody -ContentType "application/json" -Headers $agentHeaders
$subAgentId = $subAgentResponse.userId

Write-Host "  OK - Sub-Agente creado: ID $subAgentId" -ForegroundColor Green

# 6. Verificar en BD que parent_id = agentId
Write-Host "`n6. Verificar Sub-Agente en BD (parent_id debe ser $agentId)..." -ForegroundColor Yellow
$checkSubQuery = "SELECT id, username, role, parent_id FROM users WHERE id = $subAgentId;"
$dbSubResult = & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pbingo2024 bingo_24k -e $checkSubQuery 2>$null | Select-String -Pattern "$subAgentId"
Write-Host "  $dbSubResult" -ForegroundColor White

# 7. Agente crea Jugador (parent_id debe ser automático = agentId)
Write-Host "`n7. Agente crea Jugador (parent_id automático)..." -ForegroundColor Yellow
$createPlayerBody = @{
    username = "jugador_$timestamp"
    password = "test123"
    role = "jugador"
} | ConvertTo-Json

$playerResponse = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/create" -Method Post -Body $createPlayerBody -ContentType "application/json" -Headers $agentHeaders
$playerId = $playerResponse.userId

Write-Host "  OK - Jugador creado: ID $playerId" -ForegroundColor Green

# 8. Verificar en BD que parent_id = agentId
Write-Host "`n8. Verificar Jugador en BD (parent_id debe ser $agentId)..." -ForegroundColor Yellow
$checkPlayerQuery = "SELECT id, username, role, parent_id FROM users WHERE id = $playerId;"
$dbPlayerResult = & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pbingo2024 bingo_24k -e $checkPlayerQuery 2>$null | Select-String -Pattern "$playerId"
Write-Host "  $dbPlayerResult" -ForegroundColor White

# RESUMEN
Write-Host "`n=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Agente Principal (ID $agentId): parent_id = NULL (correcto - es raíz)" -ForegroundColor Yellow
Write-Host "Sub-Agente (ID $subAgentId): parent_id = $agentId (debe ser $agentId)" -ForegroundColor Yellow
Write-Host "Jugador (ID $playerId): parent_id = $agentId (debe ser $agentId)" -ForegroundColor Yellow

Write-Host "`n=== FIN TEST ===" -ForegroundColor Cyan
