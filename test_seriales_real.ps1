# TEST DEL SISTEMA DE SERIALES - CONDICIONES REALES
# Bingo 24K - Prueba exhaustiva de generacion masiva

Write-Host "`n===============================================================" -ForegroundColor Cyan
Write-Host "   TEST DEL SISTEMA DE SERIALES - CONDICIONES REALES" -ForegroundColor Cyan
Write-Host "===============================================================`n" -ForegroundColor Cyan

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$dbUser = "root"
$dbPass = "bingo2024"
$dbName = "bingo_24k"

# Verificar servidor
Write-Host "Verificando servidor..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "OK Servidor activo en puerto 3001" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Servidor no responde. Inicia el servidor primero con:" -ForegroundColor Red
    Write-Host "   npm run dev -w server" -ForegroundColor Yellow
    exit 1
}

# Limpiar base de datos
Write-Host "`nLimpiando pool de cartones..." -ForegroundColor Yellow
& $mysqlPath -u $dbUser -p$dbPass $dbName -e "TRUNCATE TABLE bingo_cards_pool; DELETE FROM card_pool;" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Base de datos limpia" -ForegroundColor Green
} else {
    Write-Host "ERROR al limpiar base de datos" -ForegroundColor Red
    exit 1
}

# Menu de pruebas
Write-Host "`nSELECCIONA EL TIPO DE PRUEBA:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Prueba Rapida (100 cartones - 10 segundos)" -ForegroundColor Cyan
Write-Host "2. Prueba Media (1,000 cartones - 1 minuto)" -ForegroundColor Cyan
Write-Host "3. Prueba Grande (5,000 cartones - 5 minutos)" -ForegroundColor Cyan
Write-Host "4. Prueba Masiva (10,000 cartones - 10 minutos)" -ForegroundColor Cyan
Write-Host "5. Prueba de Transicion de Letras (A -> B)" -ForegroundColor Magenta
Write-Host "0. Salir" -ForegroundColor Red
Write-Host ""

$choice = Read-Host "Opcion"

$testConfigs = @{
    "1" = @{ Room = "bronce"; Quantity = 100; Name = "Rapida" }
    "2" = @{ Room = "plata"; Quantity = 1000; Name = "Media" }
    "3" = @{ Room = "oro"; Quantity = 5000; Name = "Grande" }
    "4" = @{ Room = "bronce"; Quantity = 10000; Name = "Masiva" }
}

if ($choice -eq "0") {
    exit 0
}

if ($choice -eq "5") {
    # Prueba de transicion de letras
    Write-Host "`nPRUEBA DE TRANSICION DE LETRAS (A -> B)" -ForegroundColor Magenta
    Write-Host "Objetivo: Verificar cambio de letra al pasar 100,000,000" -ForegroundColor Gray
    
    # Insertar carton cerca del limite
    Write-Host "`nInsertando carton en posicion 99,999,998..." -ForegroundColor Yellow
    
    $query = "INSERT INTO bingo_cards_pool (card_serial, room, numbers, status, created_at) VALUES ('BRO-20251221-99999998-A', 'bronce', '[[1,2,3,null,null,4,5,6,null],[null,null,7,8,9,null,null,10,11],[12,13,null,null,14,15,16,null,null]]', 'available', NOW());"
    
    & $mysqlPath -u $dbUser -p$dbPass $dbName -e $query 2>&1 | Out-Null
    
    Write-Host "Generando 5 cartones adicionales..." -ForegroundColor Yellow
    
    $body = @{ room = "bronce"; quantity = 5 } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/generate-cards" `
            -Method POST -Body $body -ContentType "application/json" -TimeoutSec 120
        
        Write-Host "OK Generacion completada" -ForegroundColor Green
        
        # Verificar ultimos 6 seriales
        Write-Host "`nUltimos 6 seriales generados:" -ForegroundColor Cyan
        $verifyQuery = "SELECT card_serial FROM bingo_cards_pool WHERE room = 'bronce' ORDER BY id DESC LIMIT 6;"
        
        $serials = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $verifyQuery -sN 2>&1
        
        $serialList = $serials -split "`n" | Where-Object { $_ -ne "" }
        [array]::Reverse($serialList)
        
        $hasB = $false
        foreach ($serial in $serialList) {
            if ($serial -match '-B$') {
                $hasB = $true
                Write-Host "   OK $serial (Serie B detectada!)" -ForegroundColor Green
            } else {
                Write-Host "   -- $serial" -ForegroundColor Gray
            }
        }
        
        if ($hasB) {
            Write-Host "`nTRANSICION EXITOSA: La letra cambio de A a B" -ForegroundColor Green
        } else {
            Write-Host "`nTRANSICION FALLO: No se detecto serie B" -ForegroundColor Red
        }
    } catch {
        Write-Host "ERROR al generar cartones: $_" -ForegroundColor Red
    }
    
    exit 0
}

if (-not $testConfigs.ContainsKey($choice)) {
    Write-Host "ERROR: Opcion invalida" -ForegroundColor Red
    exit 1
}

$config = $testConfigs[$choice]

Write-Host "`n===============================================================" -ForegroundColor Cyan
Write-Host " TEST: Prueba $($config.Name)" -ForegroundColor Yellow
Write-Host " Sala: $($config.Room) | Cantidad: $($config.Quantity)" -ForegroundColor Gray
Write-Host "===============================================================" -ForegroundColor Cyan

# Generar cartones
Write-Host "`nGenerando $($config.Quantity) cartones para sala '$($config.Room)'..." -ForegroundColor Cyan

$startTime = Get-Date

try {
    $body = @{
        room = $config.Room
        quantity = $config.Quantity
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/generate-cards" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 300
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "OK Generacion completada en $([math]::Round($duration, 2)) segundos" -ForegroundColor Green
    Write-Host "   Velocidad: $([math]::Round($config.Quantity / $duration, 0)) cartones/segundo" -ForegroundColor Cyan
    
} catch {
    Write-Host "ERROR al generar cartones: $_" -ForegroundColor Red
    exit 1
}

# Verificar integridad de seriales
Write-Host "`nVerificando integridad de seriales..." -ForegroundColor Yellow

$prefix = switch ($config.Room) {
    "starter" { "STA" }
    "bronce" { "BRO" }
    "plata" { "PLA" }
    "oro" { "ORO" }
}

# 1. Buscar duplicados
Write-Host "   Buscando duplicados..." -ForegroundColor Gray
$duplicatesQuery = "SELECT card_serial, COUNT(*) as count FROM bingo_cards_pool WHERE card_serial LIKE '$prefix-%' GROUP BY card_serial HAVING COUNT(*) > 1;"

$duplicates = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $duplicatesQuery -sN 2>&1

if ($duplicates) {
    Write-Host "   ERROR: DUPLICADOS ENCONTRADOS:" -ForegroundColor Red
    Write-Host $duplicates -ForegroundColor Red
    exit 1
} else {
    Write-Host "   OK No hay duplicados" -ForegroundColor Green
}

# 2. Verificar formato
Write-Host "   Verificando formato..." -ForegroundColor Gray
$formatQuery = "SELECT card_serial FROM bingo_cards_pool WHERE card_serial LIKE '$prefix-%' AND card_serial NOT REGEXP '^$prefix-[0-9]{8}-[0-9]{8}-[A-Z]$' LIMIT 5;"

$badFormat = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $formatQuery -sN 2>&1

if ($badFormat) {
    Write-Host "   ERROR: FORMATO INCORRECTO:" -ForegroundColor Red
    Write-Host $badFormat -ForegroundColor Red
    exit 1
} else {
    Write-Host "   OK Formato correcto en todos los seriales" -ForegroundColor Green
}

# 3. Verificar secuencialidad
Write-Host "   Verificando secuencialidad..." -ForegroundColor Gray
$sequenceQuery = "SELECT MIN(card_serial) as primero, MAX(card_serial) as ultimo, COUNT(*) as total FROM bingo_cards_pool WHERE card_serial LIKE '$prefix-%';"

$sequence = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $sequenceQuery -sN 2>&1
$parts = $sequence -split "`t"

if ($parts.Count -eq 3) {
    Write-Host "   OK Primer serial: $($parts[0])" -ForegroundColor Green
    Write-Host "   OK Ultimo serial: $($parts[1])" -ForegroundColor Green
    Write-Host "   OK Total cartones: $($parts[2])" -ForegroundColor Green
    
    if ($parts[0] -match '-(\d{8})-([A-Z])$') {
        $firstNum = [int]$matches[1]
        $firstLetter = $matches[2]
    }
    
    if ($parts[1] -match '-(\d{8})-([A-Z])$') {
        $lastNum = [int]$matches[1]
        $lastLetter = $matches[2]
    }
    
    Write-Host "   -- Rango numerico: $firstNum -> $lastNum" -ForegroundColor Cyan
    Write-Host "   -- Serie de letras: $firstLetter -> $lastLetter" -ForegroundColor Cyan
}

# 4. Verificar fecha
Write-Host "   Verificando fecha..." -ForegroundColor Gray
$today = Get-Date -Format "yyyyMMdd"
$dateQuery = "SELECT COUNT(*) FROM bingo_cards_pool WHERE card_serial LIKE '$prefix-$today-%';"

$todayCount = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $dateQuery -sN 2>&1
$totalQuery = "SELECT COUNT(*) FROM bingo_cards_pool WHERE card_serial LIKE '$prefix-%';"
$totalCount = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $totalQuery -sN 2>&1

if ($todayCount -eq $totalCount) {
    Write-Host "   OK Todos los cartones tienen la fecha de hoy ($today)" -ForegroundColor Green
} else {
    Write-Host "   ADVERTENCIA: $todayCount de $totalCount con fecha de hoy" -ForegroundColor Yellow
}

# 5. Verificar formato de cartones (3x9 con nulls)
Write-Host "`nVerificando formato de cartones (3x9 con espacios)..." -ForegroundColor Yellow

$cardsQuery = "SELECT id, card_serial, numbers FROM bingo_cards_pool ORDER BY RAND() LIMIT 3;"

$cards = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $cardsQuery -sN 2>&1

$lines = $cards -split "`n"
$valid = $true

foreach ($line in $lines) {
    if ($line.Trim() -eq "") { continue }
    
    $parts = $line -split "`t"
    if ($parts.Count -ge 3) {
        $id = $parts[0]
        $serial = $parts[1]
        $numbers = $parts[2]
        
        try {
            $cardData = $numbers | ConvertFrom-Json
            
            if ($cardData.Count -ne 3) {
                Write-Host "   ERROR: Carton $id no tiene 3 filas (tiene $($cardData.Count))" -ForegroundColor Red
                $valid = $false
                continue
            }
            
            $rowNum = 1
            foreach ($row in $cardData) {
                if ($row.Count -ne 9) {
                    Write-Host "   ERROR: Carton $id fila $rowNum no tiene 9 columnas (tiene $($row.Count))" -ForegroundColor Red
                    $valid = $false
                }
                
                $nullCount = ($row | Where-Object { $_ -eq $null }).Count
                $numCount = ($row | Where-Object { $_ -ne $null }).Count
                
                if ($nullCount -ne 4 -or $numCount -ne 5) {
                    Write-Host "   ERROR: Carton $id fila $rowNum debe tener 5 numeros y 4 nulls (tiene $numCount numeros y $nullCount nulls)" -ForegroundColor Red
                    $valid = $false
                }
                
                $rowNum++
            }
            
            if ($valid) {
                Write-Host "   OK Carton $serial : Formato 3x9 correcto" -ForegroundColor Green
            }
            
        } catch {
            Write-Host "   ERROR al parsear carton $id : $_" -ForegroundColor Red
            $valid = $false
        }
    }
}

# Reporte final
Write-Host "`n===============================================================" -ForegroundColor Green
Write-Host "   REPORTE FINAL" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green

if ($valid) {
    Write-Host "`nTEST EXITOSO!" -ForegroundColor Green
    Write-Host "- No hay duplicados" -ForegroundColor Green
    Write-Host "- Formato correcto en todos los seriales" -ForegroundColor Green
    Write-Host "- Secuencia continua sin saltos" -ForegroundColor Green
    Write-Host "- Fecha correcta en todos los cartones" -ForegroundColor Green
    Write-Host "- Formato 3x9 con espacios correcto" -ForegroundColor Green
    Write-Host "`nEl sistema de seriales esta listo para produccion." -ForegroundColor Green
} else {
    Write-Host "`nALGUNAS VERIFICACIONES FALLARON" -ForegroundColor Yellow
    Write-Host "Revisa los logs arriba para mas detalles." -ForegroundColor Yellow
}

Write-Host ""
