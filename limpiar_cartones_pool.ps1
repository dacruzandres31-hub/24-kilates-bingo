# Limpiar cartones duplicados
$env:MYSQL_PWD = "bingo2024"
$query = @"
DELETE FROM bingo_cards_pool WHERE status = 'available';
SELECT COUNT(*) as total FROM bingo_cards_pool;
"@
$query | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root bingo_24k
$env:MYSQL_PWD = $null
Write-Host "Cartones limpiados" -ForegroundColor Green
