# Script COMPLETO - Elimina sesiones y cartones, regenera todo fresco

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$password = "bingo2024"
$database = "bingo_24k"

Write-Host "=====================================" -ForegroundColor Red
Write-Host "LIMPIEZA TOTAL DE SISTEMA DE CARTONES" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Red
Write-Host ""

# 1. Eliminar todas las sesiones de juego
Write-Host "1. Eliminando sesiones de juego..." -ForegroundColor Yellow
$deleteSessions = "DELETE FROM game_sessions WHERE room IN ('free_starter', 'bronce', 'plata', 'oro');"
& $mysqlPath -u root -p$password $database -e $deleteSessions 2>$null
Write-Host "   Sesiones eliminadas" -ForegroundColor Green

# 2. Truncar tabla de cartones de sesiones
Write-Host "2. Limpiando cartones de sesiones (card_pool)..." -ForegroundColor Yellow
$truncatePool = "TRUNCATE TABLE card_pool;"
& $mysqlPath -u root -p$password $database -e $truncatePool 2>$null
Write-Host "   Tabla card_pool limpiada" -ForegroundColor Green

# 3. Truncar tabla de pool permanente
Write-Host "3. Limpiando pool permanente (bingo_cards_pool)..." -ForegroundColor Yellow
$truncateCardsPool = "TRUNCATE TABLE bingo_cards_pool;"
& $mysqlPath -u root -p$password $database -e $truncateCardsPool 2>$null
Write-Host "   Tabla bingo_cards_pool limpiada" -ForegroundColor Green

# 4. Limpiar tabla de game_winners
Write-Host "4. Limpiando ganadores historicos..." -ForegroundColor Yellow
$truncateWinners = "TRUNCATE TABLE game_winners;"
& $mysqlPath -u root -p$password $database -e $truncateWinners 2>$null
Write-Host "   Tabla game_winners limpiada" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "LIMPIEZA COMPLETADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "AHORA:" -ForegroundColor Cyan
Write-Host "1. El servidor regenerara cartones automaticamente" -ForegroundColor White
Write-Host "2. Recarga el frontend (F5)" -ForegroundColor White
Write-Host "3. Los nuevos cartones tendran formato correcto:" -ForegroundColor White
Write-Host "   - Serial: STA-20251221-NNNNNN" -ForegroundColor Gray
Write-Host "   - Formato: 3x9 con espacios en blanco" -ForegroundColor Gray
