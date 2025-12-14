# ========================================
# Aplicar FIX de Collation para sp_transfer_cards
# ========================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   APLICAR FIX COLLATION SP_TRANSFER_CARDS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si el archivo SQL existe
$sqlFile = ".\server\FIX_COLLATION_SP_TRANSFER.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERROR: Archivo no encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Archivo encontrado: $sqlFile" -ForegroundColor Green
Write-Host ""

# Ejecutar migration
Write-Host "Aplicando migration..." -ForegroundColor Yellow

try {
    $mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    
    # Ejecutar el script
    & $mysqlPath -u root -p"SQLroot24K!" bingo_24k -e "source $sqlFile" 2>&1 | Out-Null
    
    Write-Host "Migration aplicada correctamente" -ForegroundColor Green
    Write-Host ""
    
    # Verificar procedimiento
    Write-Host "Verificando procedimiento..." -ForegroundColor Yellow
    $check = & $mysqlPath -u root -p"SQLroot24K!" bingo_24k -e "SHOW PROCEDURE STATUS WHERE Db='bingo_24k' AND Name='sp_transfer_cards'\G"
    
    if ($check -match "sp_transfer_cards") {
        Write-Host "Procedimiento sp_transfer_cards existe" -ForegroundColor Green
    } else {
        Write-Host "No se pudo verificar el procedimiento" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error aplicando migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   FIX APLICADO CORRECTAMENTE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
