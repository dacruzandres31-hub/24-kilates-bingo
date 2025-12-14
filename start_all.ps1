# Iniciar Sistema Completo - Bingo 24K

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   INICIANDO SISTEMA BINGO 24K" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Backend en nueva ventana
Write-Host "1. Iniciando Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd 'c:\Users\User\Documents\24 kilates\server' ; npm run dev"
)
Start-Sleep -Seconds 5

# 2. Player en nueva ventana
Write-Host "2. Iniciando Player..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd 'c:\Users\User\Documents\24 kilates\client-player' ; npm run dev"
)
Start-Sleep -Seconds 3

# 3. Admin en nueva ventana
Write-Host "3. Iniciando Admin..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd 'c:\Users\User\Documents\24 kilates\client-admin' ; npm run dev"
)
Start-Sleep -Seconds 3

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   SISTEMA INICIADO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Player:   http://localhost:5173" -ForegroundColor Cyan
Write-Host "Admin:    http://localhost:5174" -ForegroundColor Cyan

Write-Host "`nCredenciales Admin:" -ForegroundColor Yellow
Write-Host "  Usuario: Andy" -ForegroundColor White
Write-Host "  Password: andy2024`n" -ForegroundColor White
