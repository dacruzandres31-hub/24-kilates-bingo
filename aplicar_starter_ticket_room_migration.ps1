# Aplicar migración STARTER_TICKET_ROOM_MIGRATION
Write-Host "Aplicando migración STARTER_TICKET_ROOM..." -ForegroundColor Cyan

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$migrationFile = "c:\Users\User\Documents\24 kilates\server\STARTER_TICKET_ROOM_MIGRATION.sql"

if (Test-Path $mysqlPath) {
    & $mysqlPath -u root -pbingo2024 bingo_24k -e "source $migrationFile"
    Write-Host "✅ Migración aplicada exitosamente" -ForegroundColor Green
} else {
    Write-Host "❌ MySQL no encontrado en la ruta esperada" -ForegroundColor Red
    Write-Host "Intentando con mysql en PATH..." -ForegroundColor Yellow
    mysql -u root -pbingo2024 bingo_24k -e "source $migrationFile"
}
