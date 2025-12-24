# Test Admin Gamification Stats
$BaseUrl = "http://localhost:3001/api/gamification/admin"
# Mock Admin Token (requires real login in practice, but checking route existence primarily)
# For this test, we assume the server might 401 but NOT 404 if the route exists.

Write-Host "--- CHECK ADMIN STATS ROUTE ---" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$BaseUrl/stats" -Method Get
}
catch {
    $status = $_.Exception.Response.StatusCode
    if ([int]$status -eq 401 -or [int]$status -eq 403) {
        Write-Host "   PASS: Route exists (Access Denied as expected)" -ForegroundColor Green
    }
    elseif ([int]$status -eq 404) {
        Write-Host "   FAIL: Route not found (404)" -ForegroundColor Red
    }
    else {
        Write-Host "   WARN: Unexpected status $status (Route likely exists)" -ForegroundColor Yellow
    }
}
Write-Host "--- END CHECK ---" -ForegroundColor Cyan
