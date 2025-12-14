# Ejecutar migracion Gift Cards
# Fecha: 13-DIC-2025

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$database = "bingo_24k"
$username = "root"

Write-Host "Ejecutando migracion de Gift Cards..." -ForegroundColor Cyan
Write-Host ""

# Solicitar password
$password = Read-Host "Ingresa el password de MySQL root" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host "Ejecutando SQL..." -ForegroundColor Yellow
Write-Host ""

# Cambiar al directorio del servidor
Set-Location ".\server"

# Ejecutar migracion
$result = & $mysqlPath -u $username "-p$plainPassword" $database -e "SOURCE GIFT_CARDS_MYSQL_SAFE.sql" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migracion completada!" -ForegroundColor Green
    Write-Host ""
    
    # Verificar columnas
    Write-Host "Verificando columnas creadas..." -ForegroundColor Cyan
    & $mysqlPath -u $username "-p$plainPassword" $database -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'bingo_24k' AND TABLE_NAME = 'users' AND COLUMN_NAME LIKE 'gift_cards%';"
    
    Write-Host ""
    Write-Host "LISTO! Refresca el panel de administracion (Ctrl+F5)" -ForegroundColor Green
} else {
    Write-Host "Error ejecutando migracion:" -ForegroundColor Red
    Write-Host $result
}

# Volver al directorio raiz
Set-Location ".."

# Limpiar
$plainPassword = $null
