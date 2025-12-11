# Script simplificado para crear usuario superadmin inicial
$BASE_URL = "http://localhost:3001"

Write-Host "Creando usuario SuperAdmin inicial..." -ForegroundColor Cyan

# Intentar crear usuario superadmin via endpoint de registro (si existe)
$userData = @{
    username = "admin"
    password = "admin123"
    role = "superadmin"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/register" -Method POST -Body $userData -ContentType "application/json"
    Write-Host "OK Usuario admin creado" -ForegroundColor Green
} catch {
    Write-Host "El usuario probablemente ya existe o el endpoint no esta disponible" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# Intentar login
Write-Host ""
Write-Host "Intentando login..." -ForegroundColor Cyan

$loginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "OK Login exitoso!" -ForegroundColor Green
    Write-Host "Token: $($loginResponse.token.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "Role: $($loginResponse.role)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR en login: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, crea manualmente un usuario superadmin en la BD:" -ForegroundColor Yellow
    Write-Host "INSERT INTO users (username, password_hash, role) VALUES ('admin', '\$2a\$10\$..." -ForegroundColor Gray
}
