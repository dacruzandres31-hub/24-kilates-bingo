Write-Host "BINGO 24K - PRUEBA COMPLETA" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"

Write-Host "`n1. Health Check..."
try {
    $health = Invoke-RestMethod "$baseUrl/health"
    Write-Host "   OK - Scheduler: $($health.scheduler.activeJobs) jobs" -ForegroundColor Green
} catch { Write-Host "   FAIL" -ForegroundColor Red }

Write-Host "`n2. Registro..."
$user = @{ username="test_$(Get-Random)"; password="Test123!"; email="test@test.com"; role="jugador" } | ConvertTo-Json
try {
    $reg = Invoke-RestMethod "$baseUrl/api/auth/register" -Method Post -Body $user -ContentType "application/json"
    Write-Host "   OK - User: $($reg.user.username)" -ForegroundColor Green
    $global:token = $reg.token
    $global:userId = $reg.user.id
} catch { Write-Host "   FAIL" -ForegroundColor Red }

Write-Host "`n3. Login..."
$login = @{ username=$reg.user.username; password="Test123!" } | ConvertTo-Json
try {
    $log = Invoke-RestMethod "$baseUrl/api/auth/login" -Method Post -Body $login -ContentType "application/json"
    Write-Host "   OK - Balance: $($log.user.balance)" -ForegroundColor Green
} catch { Write-Host "   FAIL" -ForegroundColor Red }

if ($global:token) {
    $headers = @{ Authorization = "Bearer $global:token" }
    
    Write-Host "`n4. Perfil Gamificacion..."
    try {
        $gam = Invoke-RestMethod "$baseUrl/api/gamification/profile" -Headers $headers
        Write-Host "   OK - Nivel: $($gam.level), XP: $($gam.currentXP)" -ForegroundColor Green
    } catch { Write-Host "   FAIL" -ForegroundColor Red }
    
    Write-Host "`n5. Inventario..."
    try {
        $inv = Invoke-RestMethod "$baseUrl/api/inventory" -Headers $headers
        Write-Host "   OK - Items: $($inv.Count)" -ForegroundColor Green
    } catch { Write-Host "   FAIL" -ForegroundColor Red }
    
    Write-Host "`n6. Perfil Usuario..."
    try {
        $prof = Invoke-RestMethod "$baseUrl/api/users/profile" -Headers $headers
        Write-Host "   OK - $($prof.username), Level $($prof.level)" -ForegroundColor Green
    } catch { Write-Host "   FAIL" -ForegroundColor Red }
}

Write-Host "`n7. Tickets Shop..."
try {
    $tickets = Invoke-RestMethod "$baseUrl/api/shop/tickets"
    Write-Host "   OK - $($tickets.Count) tipos disponibles" -ForegroundColor Green
} catch { Write-Host "   FAIL" -ForegroundColor Red }

Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host "PRUEBAS COMPLETADAS" -ForegroundColor Green
