$BASE_URL = "http://localhost:3001"

Write-Host "=== TEST JWT DEBUG ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n1. Login SuperAdmin..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $response.token

Write-Host "  Token obtenido (primeros 50 chars): $($token.Substring(0, [Math]::Min(50, $token.Length)))..." -ForegroundColor Green

# 2. Decode token manualmente (base64)
$parts = $token.Split('.')
$payload = $parts[1]

# Agregar padding si es necesario
while ($payload.Length % 4 -ne 0) {
    $payload += "="
}

$decodedBytes = [System.Convert]::FromBase64String($payload)
$decodedString = [System.Text.Encoding]::UTF8.GetString($decodedBytes)
$decodedPayload = $decodedString | ConvertFrom-Json

Write-Host "`n2. JWT Payload decodificado:" -ForegroundColor Yellow
Write-Host "  $decodedString" -ForegroundColor White

Write-Host "`n3. Campos en el payload:" -ForegroundColor Yellow
$decodedPayload.PSObject.Properties | ForEach-Object {
    Write-Host "  - $($_.Name): $($_.Value)" -ForegroundColor Cyan
}

# 4. Crear un usuario para probar
Write-Host "`n4. Crear agente de prueba..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$createBody = @{
    username = "debug_agente_$timestamp"
    password = "test123"
    role = "agente"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $createResponse = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/create" -Method Post -Body $createBody -ContentType "application/json" -Headers $headers
    Write-Host "  Agente creado: ID $($createResponse.id)" -ForegroundColor Green
    
    # 5. Verificar en BD
    Write-Host "`n5. Verificar parent_id en BD..." -ForegroundColor Yellow
    $checkQuery = "SELECT id, username, role, parent_id FROM users WHERE id = $($createResponse.id);"
    $dbResult = & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pbingo2024 bingo_24k -e $checkQuery 2>$null
    Write-Host $dbResult -ForegroundColor White
    
} catch {
    Write-Host "  ERROR al crear agente:" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FIN TEST ===" -ForegroundColor Cyan
