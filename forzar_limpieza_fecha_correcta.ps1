# Forzar limpieza TOTAL y regeneración con fecha 21/12/2025

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$password = "bingo2024"
$database = "bingo_24k"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Red
Write-Host "FORZANDO LIMPIEZA COMPLETA DE CARTONES" -ForegroundColor Red
Write-Host "Fecha correcta: 21/12/2025" -ForegroundColor Yellow
Write-Host "=======================================" -ForegroundColor Red
Write-Host ""

# 1. Verificar fecha actual del servidor
Write-Host "1. Verificando fecha actual..." -ForegroundColor Cyan
$fechaActual = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
Write-Host "   Fecha sistema: $fechaActual" -ForegroundColor Green

# 2. Eliminar TODO de bingo_cards_pool
Write-Host ""
Write-Host "2. Eliminando TODOS los cartones de bingo_cards_pool..." -ForegroundColor Yellow
$deleteQuery = "DELETE FROM bingo_cards_pool WHERE 1=1;"
& $mysqlPath -u root -p$password $database -e $deleteQuery 2>$null
Write-Host "   Cartones eliminados" -ForegroundColor Green

# 3. Reiniciar AUTO_INCREMENT
Write-Host ""
Write-Host "3. Reiniciando contador AUTO_INCREMENT..." -ForegroundColor Yellow
$alterQuery = "ALTER TABLE bingo_cards_pool AUTO_INCREMENT = 1;"
& $mysqlPath -u root -p$password $database -e $alterQuery 2>$null
Write-Host "   Contador reiniciado a 1" -ForegroundColor Green

# 4. Eliminar TODO de card_pool (sesiones)
Write-Host ""
Write-Host "4. Limpiando cartones de sesiones..." -ForegroundColor Yellow
$deletePool = "DELETE FROM card_pool WHERE 1=1;"
& $mysqlPath -u root -p$password $database -e $deletePool 2>$null
Write-Host "   Sesiones limpiadas" -ForegroundColor Green

# 5. Verificar limpieza
Write-Host ""
Write-Host "5. Verificando limpieza..." -ForegroundColor Cyan
$countQuery = "SELECT COUNT(*) FROM bingo_cards_pool;"
$count = & $mysqlPath -u root -p$password $database -N -e $countQuery 2>$null
Write-Host "   Cartones restantes: $count (debe ser 0)" -ForegroundColor $(if ($count -eq "0") { "Green" } else { "Red" })

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "LIMPIEZA COMPLETADA" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "SIGUIENTE PASO:" -ForegroundColor Cyan
Write-Host "Inicia el servidor: npm run dev -w server" -ForegroundColor White
Write-Host "Los nuevos cartones tendran serial: STA-20251221-NNNNNN" -ForegroundColor Gray
