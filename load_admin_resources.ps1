# Script para cargar recursos a usuarios admin
param(
    [string]$Username = "TestGiftAdmin",
    [string]$Password = "GiftTest123!"
)

$ErrorActionPreference = "Continue"

Write-Host "`nCARGA DE RECURSOS - ADMIN PANEL`n" -ForegroundColor Cyan

# Login
Write-Host "Iniciando sesion como $Username..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = $Username
        password = $Password
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod `
        -Uri "http://localhost:3001/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"

    $token = $loginResponse.token
    $userId = $loginResponse.user.id
    
    Write-Host "OK Login exitoso - UserID: $userId" -ForegroundColor Green
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

} catch {
    Write-Host "ERROR en login: $_" -ForegroundColor Red
    exit 1
}

# Cargar saldo
Write-Host "`nCargando saldo..." -ForegroundColor Yellow
try {
    $depositBody = @{
        userId = $userId
        amount = 10000000
        reason = "Carga inicial para testing"
    } | ConvertTo-Json

    $depositResponse = Invoke-RestMethod `
        -Uri "http://localhost:3001/api/chips/deposit" `
        -Method POST `
        -Headers $headers `
        -Body $depositBody

    Write-Host "OK Saldo cargado: $($depositResponse.data.newBalance)" -ForegroundColor Green
} catch {
    Write-Host "ERROR cargando saldo: $_" -ForegroundColor Red
}

# Cargar cartones Bronce
Write-Host "`nCargando cartones Bronce..." -ForegroundColor Yellow
try {
    $bronceBody = @{
        user_id = $userId
        room = "bronce"
        quantity = 100
        reason = "Carga inicial para testing"
    } | ConvertTo-Json

    $bronceResponse = Invoke-RestMethod `
        -Uri "http://localhost:3001/api/superadmin/cards/credit" `
        -Method POST `
        -Headers $headers `
        -Body $bronceBody

    Write-Host "OK Bronce cargados: $($bronceResponse.inventory.bronce)" -ForegroundColor Green
} catch {
    Write-Host "ERROR cargando Bronce: $_" -ForegroundColor Red
}

# Cargar cartones Plata
Write-Host "`nCargando cartones Plata..." -ForegroundColor Yellow
try {
    $plataBody = @{
        user_id = $userId
        room = "plata"
        quantity = 100
        reason = "Carga inicial para testing"
    } | ConvertTo-Json

    $plataResponse = Invoke-RestMethod `
        -Uri "http://localhost:3001/api/superadmin/cards/credit" `
        -Method POST `
        -Headers $headers `
        -Body $plataBody

    Write-Host "OK Plata cargados: $($plataResponse.inventory.plata)" -ForegroundColor Green
} catch {
    Write-Host "ERROR cargando Plata: $_" -ForegroundColor Red
}

# Cargar cartones Oro
Write-Host "`nCargando cartones Oro..." -ForegroundColor Yellow
try {
    $oroBody = @{
        user_id = $userId
        room = "oro"
        quantity = 100
        reason = "Carga inicial para testing"
    } | ConvertTo-Json

    $oroResponse = Invoke-RestMethod `
        -Uri "http://localhost:3001/api/superadmin/cards/credit" `
        -Method POST `
        -Headers $headers `
        -Body $oroBody

    Write-Host "OK Oro cargados: $($oroResponse.inventory.oro)" -ForegroundColor Green
} catch {
    Write-Host "ERROR cargando Oro: $_" -ForegroundColor Red
}

# Resumen final
Write-Host "`nCARGA COMPLETADA`n" -ForegroundColor Cyan
Write-Host "Usuario: $Username" -ForegroundColor White
Write-Host "ID: $userId" -ForegroundColor White
Write-Host "Saldo: 10.000.000" -ForegroundColor White
Write-Host "Cartones: 100 Bronce, 100 Plata, 100 Oro`n" -ForegroundColor White
