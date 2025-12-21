# ============================================================================
# TEST COMPLETO DEL SISTEMA DE SERIALES - BINGO 24K
# Prueba en condiciones reales con miles de cartones
# ============================================================================

Write-Host "`n===============================================================" -ForegroundColor Cyan
Write-Host "   TEST DEL SISTEMA DE SERIALES - CONDICIONES REALES      " -ForegroundColor Cyan
Write-Host "===============================================================`n" -ForegroundColor Cyan

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$dbUser = "root"
$dbPass = "bingo2024"
$dbName = "bingo_24k"

# ============================================================================
# CONFIGURACIÓN DE PRUEBAS
# ============================================================================

$tests = @(
    @{
        Name = "Prueba Pequeña (Validación Rápida)"
        Room = "bronce"
        Quantity = 100
        Description = "Genera 100 cartones para validación básica"
    },
    @{
        Name = "Prueba Media (Día Normal)"
        Room = "plata"
        Quantity = 1000
        Description = "Simula venta de 1 día (~1000 cartones)"
    },
    @{
        Name = "Prueba Grande (Día Peak)"
        Room = "oro"
        Quantity = 5000
        Description = "Simula día de alta demanda (5000 cartones)"
    },
    @{
        Name = "Prueba Masiva (Semana Completa)"
        Room = "bronce"
        Quantity = 10000
        Description = "Simula una semana de ventas (10,000 cartones)"
    }
)

# ============================================================================
# FUNCIÓN: VERIFICAR ESTADO DEL SERVIDOR
# ============================================================================

function Test-ServerStatus {
    Write-Host "📡 Verificando servidor..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✅ Servidor activo en puerto 3001" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Servidor no responde. Inicia el servidor primero:" -ForegroundColor Red
        Write-Host "   npm run dev -w server" -ForegroundColor Yellow
        return $false
    }
}

# ============================================================================
# FUNCIÓN: LIMPIAR BASE DE DATOS
# ============================================================================

function Clear-CardPool {
    Write-Host "`n🗑️  Limpiando pool de cartones..." -ForegroundColor Yellow
    
    $query = "TRUNCATE TABLE bingo_cards_pool; DELETE FROM card_pool;"
    
    & $mysqlPath -u $dbUser -p$dbPass $dbName -e $query 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Base de datos limpia" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al limpiar base de datos" -ForegroundColor Red
        exit 1
    }
}

# ============================================================================
# FUNCIÓN: GENERAR CARTONES VIA API
# ============================================================================

function Generate-Cards {
    param(
        [string]$Room,
        [int]$Quantity
    )
    
    Write-Host "`n🎫 Generando $Quantity cartones para sala '$Room'..." -ForegroundColor Cyan
    
    $startTime = Get-Date
    
    try {
        $body = @{
            room = $Room
            quantity = $Quantity
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/generate-cards" `
            -Method POST `
            -Body $body `
            -ContentType "application/json" `
            -TimeoutSec 120
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        Write-Host "✅ Generación completada en $([math]::Round($duration, 2)) segundos" -ForegroundColor Green
        Write-Host "   📊 Velocidad: $([math]::Round($Quantity / $duration, 0)) cartones/segundo" -ForegroundColor Cyan
        
        return @{
            Success = $true
            Duration = $duration
            Rate = $Quantity / $duration
        }
        
    } catch {
        Write-Host "❌ Error al generar cartones: $_" -ForegroundColor Red
        return @{
            Success = $false
            Duration = 0
            Rate = 0
        }
    }
}

# ============================================================================
# FUNCIÓN: VERIFICAR INTEGRIDAD DE SERIALES
# ============================================================================

function Test-SerialIntegrity {
    param(
        [string]$Room
    )
    
    Write-Host "`n🔍 Verificando integridad de seriales..." -ForegroundColor Yellow
    
    # Obtener prefijo de sala
    $prefix = switch ($Room) {
        "starter" { "STA" }
        "bronce" { "BRO" }
        "plata" { "PLA" }
        "oro" { "ORO" }
    }
    
    # 1. VERIFICAR DUPLICADOS
    Write-Host "   📌 Buscando duplicados..." -ForegroundColor Gray
    $duplicatesQuery = @"
SELECT card_serial, COUNT(*) as count 
FROM bingo_cards_pool 
WHERE card_serial LIKE '$prefix-%'
GROUP BY card_serial 
HAVING COUNT(*) > 1;
"@
    
    $duplicates = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $duplicatesQuery -sN 2>&1
    
    if ($duplicates) {
        Write-Host "   ❌ DUPLICADOS ENCONTRADOS:" -ForegroundColor Red
        Write-Host $duplicates -ForegroundColor Red
        return $false
    } else {
        Write-Host "   ✅ No hay duplicados" -ForegroundColor Green
    }
    
    # 2. VERIFICAR FORMATO
    Write-Host "   📌 Verificando formato..." -ForegroundColor Gray
    $formatQuery = @"
SELECT card_serial 
FROM bingo_cards_pool 
WHERE card_serial LIKE '$prefix-%'
AND card_serial NOT REGEXP '^$prefix-[0-9]{8}-[0-9]{8}-[A-Z]$'
LIMIT 5;
"@
    
    $badFormat = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $formatQuery -sN 2>&1
    
    if ($badFormat) {
        Write-Host "   ❌ FORMATO INCORRECTO:" -ForegroundColor Red
        Write-Host $badFormat -ForegroundColor Red
        return $false
    } else {
        Write-Host "   ✅ Formato correcto en todos los seriales" -ForegroundColor Green
    }
    
    # 3. VERIFICAR SECUENCIALIDAD
    Write-Host "   📌 Verificando secuencialidad..." -ForegroundColor Gray
    $sequenceQuery = @"
SELECT 
    MIN(card_serial) as primero,
    MAX(card_serial) as ultimo,
    COUNT(*) as total
FROM bingo_cards_pool 
WHERE card_serial LIKE '$prefix-%';
"@
    
    $sequence = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $sequenceQuery -sN 2>&1
    $parts = $sequence -split "`t"
    
    if ($parts.Count -eq 3) {
        Write-Host "   ✅ Primer serial: $($parts[0])" -ForegroundColor Green
        Write-Host "   ✅ Último serial: $($parts[1])" -ForegroundColor Green
        Write-Host "   ✅ Total cartones: $($parts[2])" -ForegroundColor Green
        
        # Extraer números para verificar continuidad
        if ($parts[0] -match '-(\d{8})-([A-Z])$') {
            $firstNum = [int]$matches[1]
            $firstLetter = $matches[2]
        }
        
        if ($parts[1] -match '-(\d{8})-([A-Z])$') {
            $lastNum = [int]$matches[1]
            $lastLetter = $matches[2]
        }
        
        Write-Host "   📊 Rango numérico: $firstNum → $lastNum" -ForegroundColor Cyan
        Write-Host "   📊 Serie de letras: $firstLetter → $lastLetter" -ForegroundColor Cyan
    }
    
    # 4. VERIFICAR FECHA
    Write-Host "   📌 Verificando fecha..." -ForegroundColor Gray
    $today = Get-Date -Format "yyyyMMdd"
    $dateQuery = @"
SELECT COUNT(*) 
FROM bingo_cards_pool 
WHERE card_serial LIKE '$prefix-$today-%';
"@
    
    $todayCount = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $dateQuery -sN 2>&1
    $totalQuery = "SELECT COUNT(*) FROM bingo_cards_pool WHERE card_serial LIKE '$prefix-%';"
    $totalCount = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $totalQuery -sN 2>&1
    
    if ($todayCount -eq $totalCount) {
        Write-Host "   ✅ Todos los cartones tienen la fecha de hoy ($today)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Advertencia: $todayCount de $totalCount con fecha de hoy" -ForegroundColor Yellow
    }
    
    return $true
}

# ============================================================================
# FUNCIÓN: VERIFICAR FORMATO DE CARTONES (3x9 con nulls)
# ============================================================================

function Test-CardFormat {
    Write-Host "`n🎴 Verificando formato de cartones (3x9 con espacios)..." -ForegroundColor Yellow
    
    $query = @"
SELECT id, card_serial, numbers 
FROM bingo_cards_pool 
ORDER BY RAND() 
LIMIT 3;
"@
    
    $cards = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $query -sN 2>&1
    
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
                
                # Verificar estructura 3x9
                if ($cardData.Count -ne 3) {
                    Write-Host "   ❌ Cartón $id: No tiene 3 filas (tiene $($cardData.Count))" -ForegroundColor Red
                    $valid = $false
                    continue
                }
                
                $rowNum = 1
                foreach ($row in $cardData) {
                    if ($row.Count -ne 9) {
                        Write-Host "   ❌ Cartón $id fila $rowNum : No tiene 9 columnas (tiene $($row.Count))" -ForegroundColor Red
                        $valid = $false
                    }
                    
                    # Contar nulls y números
                    $nullCount = ($row | Where-Object { $_ -eq $null }).Count
                    $numCount = ($row | Where-Object { $_ -ne $null }).Count
                    
                    if ($nullCount -ne 4 -or $numCount -ne 5) {
                        Write-Host "   ❌ Cartón $id fila $rowNum : Debe tener 5 números y 4 nulls (tiene $numCount números y $nullCount nulls)" -ForegroundColor Red
                        $valid = $false
                    }
                    
                    $rowNum++
                }
                
                if ($valid) {
                    Write-Host "   ✅ Cartón $serial : Formato 3x9 correcto" -ForegroundColor Green
                }
                
            } catch {
                Write-Host "   ❌ Error al parsear cartón $id : $_" -ForegroundColor Red
                $valid = $false
            }
        }
    }
    
    return $valid
}

# ============================================================================
# FUNCIÓN: PRUEBA DE ESTRÉS (GENERACIÓN MASIVA)
# ============================================================================

function Test-MassiveGeneration {
    Write-Host "`n💪 PRUEBA DE ESTRÉS: Generación masiva continua" -ForegroundColor Magenta
    Write-Host "`n   Objetivo: Verificar que no haya duplicados despues de 100,000 cartones" -ForegroundColor Gray
    
    $batches = 10
    $perBatch = 10000
    $room = "oro"
    
    Write-Host "`n   Generando $($batches * $perBatch) cartones en $batches lotes de $perBatch..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le $batches; $i++) {
        Write-Host "   📦 Lote $i/$batches..." -ForegroundColor Cyan
        $result = Generate-Cards -Room $room -Quantity $perBatch
        
        if (-not $result.Success) {
            Write-Host "   ❌ Falló el lote $i" -ForegroundColor Red
            return $false
        }
        
        Start-Sleep -Seconds 2
    }
    
    Write-Host "`n   ✅ Generación masiva completada" -ForegroundColor Green
    
    # Verificar integridad final
    return Test-SerialIntegrity -Room $room
}

# ============================================================================
# FUNCIÓN: PRUEBA DE TRANSICIÓN DE LETRAS
# ============================================================================

function Test-LetterTransition {
    Write-Host "`n🔤 PRUEBA DE TRANSICIÓN DE LETRAS (A → B)" -ForegroundColor Magenta
    Write-Host "`n   Objetivo: Verificar que al pasar 100,000,000 cambie de A a B" -ForegroundColor Gray
    
    # Limpiar
    Clear-CardPool
    
    # Simular estar cerca del límite: insertar cartón en posición 99,999,998
    Write-Host "`n   📌 Insertando cartón cerca del límite (99,999,998)..." -ForegroundColor Yellow
    
    $query = @"
INSERT INTO bingo_cards_pool (card_serial, room, numbers, status, created_at) 
VALUES ('BRO-20251221-99999998-A', 'bronce', '[[1,2,3,null,null,4,5,6,null],[null,null,7,8,9,null,null,10,11],[12,13,null,null,14,15,16,null,null]]', 'available', NOW());
"@
    
    & $mysqlPath -u $dbUser -p$dbPass $dbName -e $query 2>&1 | Out-Null
    
    # Generar 5 cartones más (deberían ser: 99999999-A, 00000000-B, 00000001-B, 00000002-B, 00000003-B)
    Write-Host "   📌 Generando 5 cartones adicionales..." -ForegroundColor Yellow
    
    $result = Generate-Cards -Room "bronce" -Quantity 5
    
    if ($result.Success) {
        # Verificar los últimos 6 seriales
        $verifyQuery = @"
SELECT card_serial 
FROM bingo_cards_pool 
WHERE room = 'bronce' 
ORDER BY id DESC 
LIMIT 6;
"@
        
        Write-Host "`n   📊 Últimos 6 seriales generados:" -ForegroundColor Cyan
        $serials = & $mysqlPath -u $dbUser -p$dbPass $dbName -e $verifyQuery -sN 2>&1
        
        $serialList = $serials -split "`n" | Where-Object { $_ -ne "" }
        
        # Invertir para mostrar en orden ascendente
        [array]::Reverse($serialList)
        
        $hasB = $false
        foreach ($serial in $serialList) {
            if ($serial -match '-B$') {
                $hasB = $true
                Write-Host "   ✅ $serial (Serie B detectada!)" -ForegroundColor Green
            } else {
                Write-Host "   📄 $serial" -ForegroundColor Gray
            }
        }
        
        if ($hasB) {
            Write-Host "`n   ✅ TRANSICIÓN EXITOSA: La letra cambió de A a B" -ForegroundColor Green
            return $true
        } else {
            Write-Host "`n   ❌ TRANSICIÓN FALLÓ: No se detectó serie B" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "   ❌ Generación falló" -ForegroundColor Red
        return $false
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host "Fecha de prueba: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# Verificar servidor
if (-not (Test-ServerStatus)) {
    exit 1
}

# Menú de pruebas
Write-Host "`n📋 SELECCIONA EL TIPO DE PRUEBA:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Prueba Rápida (100 cartones - 10 segundos)" -ForegroundColor Cyan
Write-Host "2. Prueba Media (1,000 cartones - 1 minuto)" -ForegroundColor Cyan
Write-Host "3. Prueba Grande (5,000 cartones - 5 minutos)" -ForegroundColor Cyan
Write-Host "4. Prueba Masiva (10,000 cartones - 10 minutos)" -ForegroundColor Cyan
Write-Host "5. Prueba de Estrés Extremo (100,000 cartones - 1+ hora)" -ForegroundColor Magenta
Write-Host "6. Prueba de Transición de Letras (A → B)" -ForegroundColor Magenta
Write-Host "7. Ejecutar TODAS las pruebas" -ForegroundColor Yellow
Write-Host "0. Salir" -ForegroundColor Red
Write-Host ""

$choice = Read-Host "Opción"

switch ($choice) {
    "1" { $testsToRun = @($tests[0]) }
    "2" { $testsToRun = @($tests[1]) }
    "3" { $testsToRun = @($tests[2]) }
    "4" { $testsToRun = @($tests[3]) }
    "5" { 
        Write-Host "`n⚠️  ADVERTENCIA: Esta prueba tomará más de 1 hora" -ForegroundColor Yellow
        $confirm = Read-Host "¿Continuar? (s/n)"
        if ($confirm -ne "s") { exit 0 }
        Test-MassiveGeneration
        exit 0
    }
    "6" {
        Test-LetterTransition
        exit 0
    }
    "7" { $testsToRun = $tests }
    "0" { exit 0 }
    default { 
        Write-Host "❌ Opción inválida" -ForegroundColor Red
        exit 1
    }
}

# Limpiar antes de empezar
Clear-CardPool

# Ejecutar pruebas seleccionadas
$totalTests = $testsToRun.Count
$passedTests = 0
$results = @()

foreach ($test in $testsToRun) {
    Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " TEST: $($test.Name)" -ForegroundColor Yellow
    Write-Host " Sala: $($test.Room) | Cantidad: $($test.Quantity)" -ForegroundColor Gray
    Write-Host " $($test.Description)" -ForegroundColor Gray
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    # Generar cartones
    $genResult = Generate-Cards -Room $test.Room -Quantity $test.Quantity
    
    if ($genResult.Success) {
        # Verificar integridad
        $integrityOk = Test-SerialIntegrity -Room $test.Room
        
        # Verificar formato
        $formatOk = Test-CardFormat
        
        if ($integrityOk -and $formatOk) {
            Write-Host "`n✅ TEST EXITOSO" -ForegroundColor Green
            $passedTests++
            $status = "PASSED"
        } else {
            Write-Host "`n❌ TEST FALLÓ (Problemas de integridad)" -ForegroundColor Red
            $status = "FAILED"
        }
    } else {
        Write-Host "`n❌ TEST FALLÓ (Error en generación)" -ForegroundColor Red
        $status = "FAILED"
    }
    
    $results += @{
        Name = $test.Name
        Status = $status
        Duration = $genResult.Duration
        Rate = $genResult.Rate
        Quantity = $test.Quantity
    }
    
    # Limpiar para siguiente prueba
    if ($test -ne $testsToRun[-1]) {
        Clear-CardPool
        Start-Sleep -Seconds 2
    }
}

# ============================================================================
# REPORTE FINAL
# ============================================================================

Write-Host "`n`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              📊 REPORTE FINAL DE PRUEBAS                    ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

foreach ($result in $results) {
    $statusColor = if ($result.Status -eq "PASSED") { "Green" } else { "Red" }
    $statusIcon = if ($result.Status -eq "PASSED") { "✅" } else { "❌" }
    
    Write-Host "$statusIcon $($result.Name)" -ForegroundColor $statusColor
    Write-Host "   Cartones: $($result.Quantity) | Duración: $([math]::Round($result.Duration, 2))s | Velocidad: $([math]::Round($result.Rate, 0)) cartones/seg" -ForegroundColor Gray
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Resultado: $passedTests/$totalTests pruebas exitosas" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

if ($passedTests -eq $totalTests) {
    Write-Host "`n🎉 ¡TODAS LAS PRUEBAS PASARON!" -ForegroundColor Green
    Write-Host "El sistema de seriales está listo para producción." -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Algunas pruebas fallaron. Revisa los logs arriba." -ForegroundColor Yellow
}

Write-Host ""
