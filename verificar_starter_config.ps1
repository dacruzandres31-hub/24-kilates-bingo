# Verificar tabla starter_room_config
$env:MYSQL_PWD = "bingo2024"
$query = "SELECT * FROM starter_room_config; SELECT * FROM v_starter_config;"
$query | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root bingo_24k
$env:MYSQL_PWD = $null
