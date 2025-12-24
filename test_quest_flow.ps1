# Test Quest System
$BaseUrl = "http://localhost:3001/api"
$Email = "quest_explorer_$(Get-Random)@test.com"
$Pass = "Password123!"

Write-Host "--- START QUEST TEST ---" -ForegroundColor Cyan

# 1. Register
Write-Host "1. Registering $Email..."
$bodyReg = @{ username = "Explorer$(Get-Random)"; email = $Email; password = $Pass } | ConvertTo-Json
$reg = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -Body $bodyReg -ContentType "application/json"
$Token = $reg.token
$UserId = $reg.user.id
$Headers = @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" }

# 2. Check Quests (Should be empty or mocked)
Write-Host "2. Checking Initial Quests..."
try {
    $quests = Invoke-RestMethod -Uri "$BaseUrl/gamification/quests" -Method Get -Headers $Headers
    Write-Host "   Quests Found: $($quests.quests.Count)" 
    if ($quests.quests.Count -gt 0) {
        Write-Host "   First Quest: $($quests.quests[0].name)" -ForegroundColor Green
    }
    else {
        Write-Host "   WARN: No quests found active." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   FAIL Quests: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Simulate Gameplay to Trigger Quest Progress (e.g. Play a Card)
# Note: Logic for Quest Progress is internal, validating here if endpoints respond correctly
Write-Host "3. Verifying Quest Stats..."
try {
    $stats = Invoke-RestMethod -Uri "$BaseUrl/gamification/quest-stats" -Method Get -Headers $Headers
    Write-Host "   Total Quests: $($stats.stats.total)"
    Write-Host "   Completed: $($stats.stats.completed)"
}
catch {
    Write-Host "   FAIL Stats: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "--- END QUEST TEST ---" -ForegroundColor Cyan
