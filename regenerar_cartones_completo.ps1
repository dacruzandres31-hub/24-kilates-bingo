# Script para eliminar TODOS los cartones y regenerar con formato correcto
# Formato nuevo: SALA-YYYYMMDD-NNNNNN con espacios en blanco (null)

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$password = "bingo2024"
$database = "bingo_24k"

Write-Host "LIMPIEZA Y REGENERACION DE CARTONES" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Eliminar todos los cartones de card_pool (sesiones)
Write-Host "1. Eliminando cartones de sesiones (card_pool)..." -ForegroundColor Yellow
$truncatePool = "TRUNCATE TABLE card_pool;"
& $mysqlPath -u root -p$password $database -e $truncatePool 2>$null
Write-Host "   Tabla card_pool limpiada" -ForegroundColor Green

# 2. Eliminar todos los cartones de bingo_cards_pool (pool permanente)
Write-Host "2. Eliminando cartones del pool permanente (bingo_cards_pool)..." -ForegroundColor Yellow
$truncateCardsPool = "TRUNCATE TABLE bingo_cards_pool;"
& $mysqlPath -u root -p$password $database -e $truncateCardsPool 2>$null
Write-Host "   Tabla bingo_cards_pool limpiada" -ForegroundColor Green

# 3. Reiniciar el servidor para que regenere los cartones
Write-Host ""
Write-Host "3. Los cartones se regeneraran automaticamente cuando:" -ForegroundColor Cyan
Write-Host "   - Se inicie el servidor (CardPoolManager)" -ForegroundColor White
Write-Host "   - Se cree una nueva sesion de juego" -ForegroundColor White
Write-Host ""

Write-Host "PROCESO COMPLETADO" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""
Write-Host "Siguiente paso: Reinicia el servidor backend" -ForegroundColor Yellow
Write-Host "Comando: Get-Process node | Stop-Process -Force; npm run dev -w server" -ForegroundColor Gray
