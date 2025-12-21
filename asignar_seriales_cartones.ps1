# Script para asignar seriales a cartones sin serial
# Formato: SALA-YYYYMMDD-NNNNNN

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$password = "bingo2024"
$database = "bingo_24k"

Write-Host "Asignando seriales a cartones..." -ForegroundColor Cyan

# Fecha actual
$fecha = Get-Date -Format "yyyyMMdd"

# Mapeo de salas a prefijos
$roomPrefixes = @{
    "starter" = "STA"
    "bronce" = "BRO"
    "plata" = "PLA"
    "oro" = "ORO"
}

foreach ($room in $roomPrefixes.Keys) {
    $prefix = $roomPrefixes[$room]
    
    Write-Host ""
    Write-Host "Procesando sala: $room ($prefix)" -ForegroundColor Yellow
    
    # Obtener cartones sin serial de esta sala
    $query = "SELECT id FROM bingo_cards_pool WHERE room = '$room' AND serial IS NULL ORDER BY id;"
    $cartones = & $mysqlPath -u root -p$password $database -N -e $query 2>$null
    
    $count = ($cartones | Measure-Object).Count
    Write-Host "Cartones a actualizar: $count" -ForegroundColor White
    
    $contador = 1
    foreach ($id in $cartones) {
        $serial = "{0}-{1}-{2:D6}" -f $prefix, $fecha, $contador
        
        # Actualizar serial
        $updateQuery = "UPDATE bingo_cards_pool SET serial = '$serial' WHERE id = $id;"
        & $mysqlPath -u root -p$password $database -e $updateQuery 2>$null
        
        if ($contador % 100 -eq 0) {
            Write-Host "Progreso: $contador de $count cartones" -ForegroundColor Gray
        }
        
        $contador++
    }
    
    Write-Host "Completado: $($contador - 1) cartones actualizados" -ForegroundColor Green
}

Write-Host ""
Write-Host "Proceso completado. Verificando..." -ForegroundColor Green

# Verificar resultados
$verifyQuery = "SELECT room, COUNT(*) as total, SUM(CASE WHEN serial IS NULL THEN 1 ELSE 0 END) as sin_serial, SUM(CASE WHEN serial IS NOT NULL THEN 1 ELSE 0 END) as con_serial FROM bingo_cards_pool GROUP BY room;"
& $mysqlPath -u root -p$password $database -t -e $verifyQuery 2>$null | Select-Object -Skip 1

Write-Host ""
Write-Host "Todos los cartones ahora tienen serial!" -ForegroundColor Green
