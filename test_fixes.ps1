# Test de correcciones: Starter loading + Admin 10x bug

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  TEST DE CORRECCIONES - BINGO 24K" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Test 1: Endpoint de cartones disponibles en Starter
Write-Host "`n[TEST 1] Verificando endpoint /api/cards/available/starter..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/cards/available/starter" -Method GET
    Write-Host "✅ Endpoint responde correctamente" -ForegroundColor Green
    Write-Host "   Cantidad de cartones: $($response.cards.Count)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Inventario del admin (user_id=1)
Write-Host "`n[TEST 2] Verificando inventario del admin en Dashboard..." -ForegroundColor Yellow

# Obtener token del admin
$adminToken = Get-Content "C:\Users\User\Documents\24 kilates\admin_token.txt" -ErrorAction SilentlyContinue

if ($adminToken) {
    try {
        $headers = @{
            Authorization = "Bearer $adminToken"
        }
        $inventory = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/cards/inventory" -Method GET -Headers $headers
        
        Write-Host "✅ Inventario obtenido correctamente" -ForegroundColor Green
        
        foreach ($item in $inventory.inventory) {
            Write-Host "   Sala: $($item.room) - Cantidad: $($item.total_cards)" -ForegroundColor White
        }
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  Token del admin no encontrado" -ForegroundColor Yellow
}

# Test 3: Verificar cartones del usuario Eve27 (ID: 1040)
Write-Host "`n[TEST 3] Verificando cartones de Eve27 (ID: 1040) en BD..." -ForegroundColor Yellow

$query = "SELECT user_id, room, quantity, is_gift FROM user_card_inventory WHERE user_id = 1040 ORDER BY room, is_gift"
$result = & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pbingo2024 bingo_24k -e $query 2>&1 | Select-String -Pattern "^\|" -CaseSensitive

if ($result) {
    Write-Host "✅ Datos en BD:" -ForegroundColor Green
    $result | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
} else {
    Write-Host "❌ No se pudieron obtener datos de la BD" -ForegroundColor Red
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "1. Dashboard ahora usa 'total_cards' en lugar de 'total_quantity'" -ForegroundColor White
Write-Host "2. CardSelectionLobby diferencia entre Starter y salas pagas" -ForegroundColor White
Write-Host "3. Modal de selección de paquete solo aparece en Starter" -ForegroundColor White
Write-Host "`nPor favor, verifica manualmente:" -ForegroundColor Yellow
Write-Host "  - http://localhost:5174/dashboard (Admin debe mostrar 50, NO 500)" -ForegroundColor Cyan
Write-Host "  - http://localhost:5173/sala/starter (Debe cargar sin trabarse)" -ForegroundColor Cyan
Write-Host ""
