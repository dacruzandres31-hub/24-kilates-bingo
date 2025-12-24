# Test Suite for Tickets System v1.3.0
# PowerShell Script

$BaseURL = "http://localhost:3001"
$Headers = @{ "Content-Type" = "application/json" }

Write-Host "`n=== TESTING TICKETS SYSTEM v1.3.0 ===`n" -ForegroundColor Cyan

# 1. Register User
$timestamp = Get-Date -Format "HHmmss"
$username = "ticket_user_$timestamp"
Write-Host "[1/6] Registering user: $username..." -ForegroundColor Yellow
$body = @{ username = $username; password = "Password123"; role = "jugador" } | ConvertTo-Json
try {
    $auth = Invoke-RestMethod -Uri "$BaseURL/api/auth/register" -Method Post -Headers $Headers -Body $body
    $token = $auth.token
    $headersAuth = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $token" }
    Write-Host "PASS - User created (ID: $($auth.user.id))" -ForegroundColor Green
}
catch {
    Write-Host "FAIL - Register: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Check Empty Tickets
Write-Host "`n[2/6] Checking empty inventory..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BaseURL/api/shop/my-tickets" -Method Get -Headers $headersAuth
    if ($res.total -eq 0) { Write-Host "PASS - Inventory empty" -ForegroundColor Green }
    else { Write-Host "FAIL - Expected 0 tickets, got $($res.total)" -ForegroundColor Red }
}
catch { Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red }

# 3. Find Sessions
Write-Host "`n[3/6] Finding active sessions..." -ForegroundColor Yellow
$starterSessionId = $null
$paidSessionId = $null

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/api/game/sessions" -Method Get -Headers $headersAuth
    # The API returns { sessions: [...] }
    $sessions = $response.sessions

    # Find STARTER session (for winning ticket)
    $starter = $sessions | Where-Object { $_.room -eq 'free_starter' } | Select-Object -First 1
    if ($starter) {
        $starterSessionId = $starter.id
        Write-Host "PASS - Found STARTER Session: $starterSessionId" -ForegroundColor Green
    }
    else {
        Write-Host "WARN - No STARTER session found" -ForegroundColor Gray
    }

    # Find PAID session (for using ticket) - e.g. Bronce
    $paid = $sessions | Where-Object { $_.room -eq 'bronce' } | Select-Object -First 1
    if ($paid) {
        $paidSessionId = $paid.id
        Write-Host "PASS - Found PAID Session (Bronce): $paidSessionId" -ForegroundColor Green
    }
    else {
        # Fallback to any paid
        $paid = $sessions | Where-Object { $_.room -ne 'free_starter' } | Select-Object -First 1
        if ($paid) {
            $paidSessionId = $paid.id
            Write-Host "WARN - Using fallback paid session: $paidSessionId ($($paid.room))" -ForegroundColor Gray
        }
        else {
            Write-Host "WARN - No PAID session found" -ForegroundColor Gray
        }
    }
}
catch { Write-Host "FAIL - Session fetch: $($_.Exception.Message)" -ForegroundColor Red }

# 4. Simulate Win (Bingo) -> Gets Ticket
if ($starterSessionId) {
    Write-Host "`n[4/6] Simulating Bingo Win (Expected: Ticket Reward)..." -ForegroundColor Yellow
    $winBody = @{ gameSessionId = $starterSessionId; winType = "bingo" } | ConvertTo-Json
    try {
        $winRes = Invoke-RestMethod -Uri "$BaseURL/api/game/end-free-game" -Method Post -Headers $headersAuth -Body $winBody
        
        # Check reward structure
        # Expected: { success: true, reward: { type: 'bingo_combo', items: [...] } }
        $items = $winRes.reward.items
        $ticket = $items | Where-Object { $_.type -match "ticket" }
        
        if ($ticket) {
            Write-Host "PASS - Won Ticket: $($ticket.name)" -ForegroundColor Green
        }
        else {
            Write-Host "FAIL - Bingo won but no ticket found. Output: $($winRes | ConvertTo-Json -Depth 2)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "FAIL - Win Simulation: $($_.Exception.Message)" -ForegroundColor Red
    }
}
else {
    Write-Host "SKIPPING [4/6] - No STARTER session" -ForegroundColor Gray
}

# 5. Verify Ticket in Inventory
Write-Host "`n[5/6] Verifying Ticket in Inventory..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BaseURL/api/shop/my-tickets" -Method Get -Headers $headersAuth
    $ticketCount = 0
    if ($res.tickets) {
        $ticketCount = $res.tickets | Measure-Object -Property quantity -Sum | Select-Object -ExpandProperty Sum
    }
    
    if (($res.total -ge 1) -or ($ticketCount -ge 1)) {
        Write-Host "PASS - Tickets found: $ticketCount" -ForegroundColor Green
    }
    else {
        Write-Host "FAIL - Inventory still empty." -ForegroundColor Red
    }
}
catch { Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red }

# 6. Buy Card with Ticket
Write-Host "`n[6/6] Buying Card with Ticket..." -ForegroundColor Yellow
if ($paidSessionId) {
    # Need to target a paid room (e.g. bronce) to use ticket
    $buyBody = @{ roomType = "bronce"; quantity = 1; sessionId = $paidSessionId; paymentMethod = "ticket" } | ConvertTo-Json
    
    try {
        $buyRes = Invoke-RestMethod -Uri "$BaseURL/api/shop/buy-card" -Method Post -Headers $headersAuth -Body $buyBody
        
        if ($buyRes.paymentMethod -eq "ticket") {
            Write-Host "PASS - Paid with TICKET. Remaining: $($buyRes.ticketsRemaining)" -ForegroundColor Green
        }
        elseif ($buyRes.paymentMethod -eq "cash") {
            Write-Host "FAIL - Paid with CASH. (Maybe ticket didn't apply?)" -ForegroundColor Red
        }
        else {
            Write-Host "WARN - Unknown payment method: $($buyRes.paymentMethod)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "FAIL - Buy Card: $($_.Exception.Message)" -ForegroundColor Red 
        Write-Host "Error Details: $($_.ErrorDetails)" -ForegroundColor Gray
    }
}
else {
    Write-Host "SKIPPING [6/6] - No PAID session (Bronce)" -ForegroundColor Gray
}

Write-Host "`n=== TEST COMPLETE ===`n" -ForegroundColor Cyan
