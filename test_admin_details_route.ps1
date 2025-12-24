# Test Admin Player Details Route
$BaseUrl = "http://localhost:3001/api/gamification/admin/player"
$UserId = "1072" # User ID (from logs)
# Mock Admin Token (checking route existence primarily)

Write-Host "--- CHECK ADMIN PLAYER DETAILS ROUTE ---" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$BaseUrl/$UserId" -Method Get
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
