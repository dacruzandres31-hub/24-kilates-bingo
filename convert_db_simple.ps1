$ErrorActionPreference = "Stop"

Write-Host "Convirtiendo base de datos a utf8mb4_unicode_ci..." -ForegroundColor Yellow

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$password = "bingo2024"

# Configurar password
$env:MYSQL_PWD = $password

# Convertir base de datos
& $mysqlPath -u root -e "ALTER DATABASE bingo_24k CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Obtener lista de SOLO tablas (no vistas)
$query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'bingo_24k' AND table_type = 'BASE TABLE';"
$tables = & $mysqlPath -u root -D bingo_24k -N -B -e $query

$count = 0
foreach ($table in $tables) {
    Write-Host "Convirtiendo tabla: $table" -ForegroundColor Gray
    & $mysqlPath -u root -D bingo_24k -e "ALTER TABLE ``$table`` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    $count++
}

Remove-Item Env:\MYSQL_PWD

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "CONVERSION COMPLETA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "$count tablas convertidas a utf8mb4_unicode_ci" -ForegroundColor Gray
Write-Host ""
