# Test Gamification V2 Simplified
$BaseUrl = "http://127.0.0.1:3001/api"
$Email = "gamer_$(Get-Random)@test.com"
$Pass = "Password123!"

Write-Host "--- START TEST ---" -ForegroundColor Cyan

# 1. Register
Write-Host "1. Registering $Email..."
$bodyReg = @{ username = "Gamer$(Get-Random)"; email = $Email; password = $Pass } | ConvertTo-Json
$reg = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -Body $bodyReg -ContentType "application/json"
$Token = $reg.token
$UserId = $reg.user.id

Write-Host "   User ID: $UserId"
Write-Host "   Streak: $($reg.user.gamification.streak)"

$Headers = @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" }

# 2. Check Progress
Write-Host "2. Checking Progress..."
$prog = Invoke-RestMethod -Uri "$BaseUrl/gamification/progress" -Method Get -Headers $Headers
Write-Host "   Level: $($prog.account.level)"
Write-Host "   XP: $($prog.account.current_xp)"

# 3. Simulate Streak Claim (Fail Expected)
Write-Host "3. Testing Streak Claim (Expect Fail)..."
try {
    $claim = Invoke-RestMethod -Uri "$BaseUrl/gamification/claim-streak" -Method Post -Headers $Headers
    Write-Host "   WARN: Claim succeeded? $($claim)" -ForegroundColor Yellow
}
catch {
    Write-Host "   PASS: Claim failed as expected ($($_.Exception.Message))" -ForegroundColor Green
}

# 4. Buy Card (High Roller)
Write-Host "4. Buying Card for High Roller..."
try {
    # Find free session
    $sessRes = Invoke-RestMethod -Uri "$BaseUrl/game/sessions/available?room=free_starter" -Method Get -Headers $Headers
    if ($sessRes.sessions.Count -gt 0) {
        $sessId = $sessRes.sessions[0].id
        Write-Host "   Session: $sessId"
        
        $buyBody = @{ roomType = "free_starter"; quantity = 1; game_session_id = $sessId } | ConvertTo-Json
        $buy = Invoke-RestMethod -Uri "$BaseUrl/shop/buy-card" -Method Post -Headers $Headers -Body $buyBody
        
        Write-Host "   Buy Success: $($buy.success)"
        if ($buy.gamification) {
            Write-Host "   Gamification Triggered: $($buy.gamification)" -ForegroundColor Green
        }
    }
}
catch {
    Write-Host "   FAIL Buy: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        $body = $reader.ReadToEnd()
        Write-Host "   Response Body: $body" -ForegroundColor Gray
    }
}

# 5. Verify Achievements
Write-Host "5. Checking Achievements..."
try {
    $ach = Invoke-RestMethod -Uri "$BaseUrl/gamification/achievements" -Method Get -Headers $Headers
    $highRoller = $ach.achievements | Where-Object { $_.code -eq 'HIGH_ROLLER' }
    if ($highRoller) {
        Write-Host "   High Roller Progress: $($highRoller.current_value)" -ForegroundColor Green
    }
}
catch {
    Write-Host "   FAIL Achievements: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "--- END TEST ---" -ForegroundColor Cyan
