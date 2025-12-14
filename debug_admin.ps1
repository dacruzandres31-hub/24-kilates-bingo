# Script de Debug - Panel Admin

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   DEBUG PANEL ADMIN - BINGO 24K" -ForegroundColor Cyan  
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Verificar Backend
Write-Host "1. Verificando Backend..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
    Write-Host "   Backend: OK" -ForegroundColor Green
} catch {
    Write-Host "   Backend: ERROR - No responde en puerto 3001" -ForegroundColor Red
    exit 1
}

# 2. Verificar Login
Write-Host "`n2. Probando Login..." -ForegroundColor Yellow
$loginBody = @{
    username = "Andy"
    password = "andy2024"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody
    
    $token = $loginResponse.token
    $user = $loginResponse.user
    
    Write-Host "   Login: OK" -ForegroundColor Green
    Write-Host "   Usuario: $($user.username)" -ForegroundColor Cyan
    Write-Host "   Role: $($user.role)" -ForegroundColor Cyan
    Write-Host "   ID: $($user.id)" -ForegroundColor Cyan
} catch {
    Write-Host "   Login: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Verificar Endpoint de Usuarios
Write-Host "`n3. Probando Endpoint de Usuarios..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $usersResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/users/hierarchy" `
        -Method GET `
        -Headers $headers
    
    Write-Host "   Endpoint: OK" -ForegroundColor Green
    Write-Host "   Success: $($usersResponse.success)" -ForegroundColor Cyan
    Write-Host "   Total usuarios: $($usersResponse.all.Count)" -ForegroundColor Cyan
    Write-Host "   Arbol: $($usersResponse.tree.Count) nodo(s)" -ForegroundColor Cyan
    
    if ($usersResponse.all.Count -gt 0) {
        Write-Host "`n   Primer usuario:" -ForegroundColor White
        $first = $usersResponse.all[0]
        Write-Host "     - ID: $($first.id)" -ForegroundColor Gray
        Write-Host "     - Username: $($first.username)" -ForegroundColor Gray
        Write-Host "     - Role: $($first.role)" -ForegroundColor Gray
        Write-Host "     - Balance: $($first.balance)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   Endpoint: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Verificar Frontend
Write-Host "`n4. Verificando Frontend Admin..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5174" -Method GET -UseBasicParsing
    Write-Host "   Frontend: OK (Status $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   Frontend: ERROR - No responde en puerto 5174" -ForegroundColor Red
    exit 1
}

# 5. Resumen
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend (3001):    OK" -ForegroundColor Green
Write-Host "Login Andy:        OK" -ForegroundColor Green
Write-Host "Endpoint Usuarios: OK" -ForegroundColor Green
Write-Host "Frontend (5174):   OK" -ForegroundColor Green
Write-Host "`nTODO FUNCIONAL - El problema esta en el navegador" -ForegroundColor Yellow
Write-Host "`nPasos siguientes:" -ForegroundColor White
Write-Host "1. Abre http://localhost:5174" -ForegroundColor Cyan
Write-Host "2. Presiona Ctrl+Shift+R para limpiar cache" -ForegroundColor Cyan
Write-Host "3. Abre DevTools (F12) -> Console" -ForegroundColor Cyan
Write-Host "4. Haz login con Andy/andy2024" -ForegroundColor Cyan
Write-Host "5. Busca errores en Console y Network tabs`n" -ForegroundColor Cyan
