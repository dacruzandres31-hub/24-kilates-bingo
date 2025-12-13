$BASE_URL = "http://localhost:3001"

Write-Host "=== TEST LOGIN CREDENTIALS ===" -ForegroundColor Cyan

$testCredentials = @(
    @{ username = "superadmin"; password = "admin123" },
    @{ username = "admin"; password = "admin123" },
    @{ username = "Andy"; password = "admin123" },
    @{ username = "Andy"; password = "password" }
)

foreach ($cred in $testCredentials) {
    Write-Host "`nProbando: $($cred.username) / $($cred.password)" -ForegroundColor Yellow
    
    $loginBody = @{
        username = $cred.username
        password = $cred.password
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
        Write-Host "  OK LOGIN EXITOSO" -ForegroundColor Green
        Write-Host "  User ID: $($response.user.id)" -ForegroundColor White
        Write-Host "  Role: $($response.user.role)" -ForegroundColor White
        break
    } catch {
        Write-Host "  FALLO" -ForegroundColor Red
    }
}

Write-Host "`n=== FIN TEST ===" -ForegroundColor Cyan
