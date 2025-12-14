# ========================================
# Test Sistema Login de Jugadores
# ========================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST LOGIN DE JUGADORES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"

# Test 1: Registrar nuevo jugador
Write-Host "1. Registrando nuevo jugador..." -ForegroundColor Yellow

$registerData = @{
    username = "TestPlayer$(Get-Random -Minimum 100 -Maximum 999)"
    password = "player123"
    email = "test@player.com"
    role = "jugador"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "   Usuario creado: $($registerResponse.user.username)" -ForegroundColor Green
    Write-Host "   ID: $($registerResponse.user.id)" -ForegroundColor Green
    Write-Host "   Role: $($registerResponse.user.role)" -ForegroundColor Green
    Write-Host "   Token: $($registerResponse.token.Substring(0, 20))..." -ForegroundColor Green
    
    $testUsername = $registerResponse.user.username
    $testUserId = $registerResponse.user.id
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Login con usuario recién creado
Write-Host "2. Login con usuario creado..." -ForegroundColor Yellow

$loginData = @{
    username = $testUsername
    password = "player123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "   Login exitoso!" -ForegroundColor Green
    Write-Host "   Usuario: $($loginResponse.user.username)" -ForegroundColor Green
    Write-Host "   Balance: $$($loginResponse.user.balance)" -ForegroundColor Green
    Write-Host "   Token valido: SI" -ForegroundColor Green
    
    $token = $loginResponse.token
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Verificar token
Write-Host "3. Verificando token..." -ForegroundColor Yellow

$headers = @{
    Authorization = "Bearer $token"
}

try {
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify" -Method GET -Headers $headers
    Write-Host "   Token valido!" -ForegroundColor Green
    Write-Host "   User ID: $($verifyResponse.user.id)" -ForegroundColor Green
    Write-Host "   Role: $($verifyResponse.user.role)" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Intentar registrar con username duplicado
Write-Host "4. Test username duplicado..." -ForegroundColor Yellow

$duplicateData = @{
    username = $testUsername
    password = "otrapass123"
    role = "jugador"
} | ConvertTo-Json

try {
    $dupResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $duplicateData -ContentType "application/json"
    Write-Host "   ERROR: Deberia haber fallado por duplicado!" -ForegroundColor Red
} catch {
    $errorMsg = ($_.ErrorDetails.Message | ConvertFrom-Json).error
    if ($errorMsg -match "ya existe") {
        Write-Host "   Validacion OK: $errorMsg" -ForegroundColor Green
    } else {
        Write-Host "   ERROR inesperado: $errorMsg" -ForegroundColor Red
    }
}

Write-Host ""

# Test 5: Login con contraseña incorrecta
Write-Host "5. Test login con contraseña incorrecta..." -ForegroundColor Yellow

$wrongPassData = @{
    username = $testUsername
    password = "passwordIncorrecta"
} | ConvertTo-Json

try {
    $wrongResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $wrongPassData -ContentType "application/json"
    Write-Host "   ERROR: Deberia haber fallado!" -ForegroundColor Red
} catch {
    $errorMsg = ($_.ErrorDetails.Message | ConvertFrom-Json).error
    if ($errorMsg -match "inválidos") {
        Write-Host "   Validacion OK: $errorMsg" -ForegroundColor Green
    } else {
        Write-Host "   ERROR inesperado: $errorMsg" -ForegroundColor Red
    }
}

Write-Host ""

# Test 6: Verificar inicializacion de gamificacion
Write-Host "6. Verificando gamificacion..." -ForegroundColor Yellow

try {
    $gamifResponse = Invoke-RestMethod -Uri "$baseUrl/api/gamification/profile" -Method GET -Headers $headers
    Write-Host "   Nivel: $($gamifResponse.level)" -ForegroundColor Green
    Write-Host "   XP: $($gamifResponse.xpCurrent)/$($gamifResponse.xpNeeded)" -ForegroundColor Green
    Write-Host "   Quests diarias: $($gamifResponse.dailyQuests.Count)" -ForegroundColor Green
} catch {
    Write-Host "   WARNING: No se pudo verificar gamificacion" -ForegroundColor Yellow
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   TODOS LOS TESTS COMPLETADOS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Usuario de prueba creado:" -ForegroundColor Cyan
Write-Host "  Username: $testUsername" -ForegroundColor White
Write-Host "  Password: player123" -ForegroundColor White
Write-Host "  ID: $testUserId" -ForegroundColor White
Write-Host ""
