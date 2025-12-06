# Test directo de endpoints problemáticos

$BaseURL = "http://localhost:3001"
$Headers = @{"Content-Type" = "application/json"}

Write-Host "`n=== REGISTRO Y LOGIN ===" -ForegroundColor Cyan

# Registrar
$timestamp = Get-Date -Format "HHmmss"
$registerBody = @{
    username = "testdebug_$timestamp"
    password = "Test123!"
    role = "jugador"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BaseURL/api/auth/register" -Method Post -Headers $Headers -Body $registerBody
$token = $response.token
$userId = $response.user.id

Write-Host "Usuario creado: $($response.user.username) (ID: $userId)"

$authHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== TEST TOP PLAYERS ===" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/top-players?limit=5" -Headers $authHeaders
    Write-Host "PASS - Top players: $($response.topPlayers.Count)" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $_.Exception.Message
}

Write-Host "`n=== TEST QUESTS ===" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/quests" -Headers $authHeaders
    Write-Host "PASS - Quests: $($response.quests.Count)" -ForegroundColor Green
    $response.quests | ForEach-Object {
        Write-Host "  - $($_.quest_name): $($_.current_value)/$($_.target_value)" -ForegroundColor Gray
    }
} catch {
    Write-Host "FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $_.Exception.Message
}

Write-Host "`n=== TEST PROGRESO ===" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/gamification/progress" -Headers $authHeaders
    Write-Host "PASS - Progreso obtenido" -ForegroundColor Green
    Write-Host "  Level: $($response.data.progress.current_level)" -ForegroundColor Gray
    Write-Host "  XP: $($response.data.progress.xp_current)/$($response.data.progress.xp_for_next)" -ForegroundColor Gray
} catch {
    Write-Host "FAIL - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $_.Exception.Message
}

Write-Host ""
