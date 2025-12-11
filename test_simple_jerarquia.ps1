# Test simple del sistema jerarquico
$BASE_URL = "http://localhost:3001"

Write-Host "=== TEST SISTEMA JERARQUICO ===" -ForegroundColor Cyan
Write-Host ""

# 1. Login SuperAdmin
Write-Host "1. Login SuperAdmin..." -ForegroundColor Yellow
$login = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $login -ContentType "application/json"
$TOKEN = $response.token
Write-Host "   OK - Token obtenido" -ForegroundColor Green
Write-Host ""

# 2. Ver jerarquia inicial
Write-Host "2. Ver jerarquia (debe estar vacia o con pocos usuarios)..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $TOKEN" }
$jerarquia = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/hierarchy" -Method GET -Headers $headers
Write-Host "   Usuarios actuales: $($jerarquia.all.Count)" -ForegroundColor Gray
Write-Host "   Role actual: $($jerarquia.currentUser.role)" -ForegroundColor Gray
Write-Host ""

# 3. Crear Agente
Write-Host "3. Crear Agente..." -ForegroundColor Yellow
$agente = @{
    username = "test_agente_$(Get-Random -Maximum 9999)"
    password = "test123"
    role = "agente"
} | ConvertTo-Json

Write-Host "   Enviando: $agente" -ForegroundColor Gray

try {
    $respAgente = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/create" -Method POST -Body $agente -ContentType "application/json" -Headers $headers
    Write-Host "   OK - Agente creado con ID: $($respAgente.userId)" -ForegroundColor Green
    Write-Host "   Mensaje: $($respAgente.message)" -ForegroundColor Gray
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "   ERROR: $($errorDetails.error)" -ForegroundColor Red
    Write-Host "   Detalles: $($errorDetails.details)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== FIN DEL TEST ===" -ForegroundColor Cyan
