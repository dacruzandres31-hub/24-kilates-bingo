# Ejecutar migración de Gift Cards
# Este script ejecuta el SQL directamente

Write-Host "🚀 Ejecutando migración de Gift Cards..." -ForegroundColor Cyan
Write-Host ""

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$sqlFile = ".\server\GIFT_CARDS_MYSQL_SAFE.sql"
$database = "bingo_24k"
$username = "root"

# Solicitar password
$password = Read-Host "Ingresa el password de MySQL root" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host "📝 Ejecutando SQL..." -ForegroundColor Yellow

# Ejecutar con password
& $mysqlPath -u $username -p"$plainPassword" $database -e "SOURCE $sqlFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migración completada exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verificando columnas creadas..." -ForegroundColor Cyan
    
    # Verificar columnas
    $verifyQuery = "SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$database' AND TABLE_NAME = 'users' AND COLUMN_NAME LIKE 'gift_cards%';"
    & $mysqlPath -u $username -p"$plainPassword" $database -e "$verifyQuery"
    
    Write-Host ""
    Write-Host "🎉 Ahora puedes refrescar el panel de administración (Ctrl+F5)" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error ejecutando migración" -ForegroundColor Red
    Write-Host "Código de error: $LASTEXITCODE" -ForegroundColor Red
}

# Limpiar password de memoria
$plainPassword = $null
[System.GC]::Collect()
