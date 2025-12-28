$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BACKUP DE BASE DE DATOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mysqldumpPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$password = "bingo2024"
$backupFile = "bingo_24k_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

Write-Host "Creando backup de bingo_24k..." -ForegroundColor Yellow
Write-Host "Archivo: $backupFile" -ForegroundColor Gray
Write-Host ""

# Crear backup
$env:MYSQL_PWD = $password
& $mysqldumpPath -u root --databases bingo_24k --routines --triggers --events > $backupFile 2>&1

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $backupFile).Length / 1MB
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ">>> BACKUP CREADO EXITOSAMENTE <<<" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Archivo: $backupFile" -ForegroundColor Gray
    Write-Host "Tamaño: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host "ERROR CREANDO BACKUP" -ForegroundColor Red
    exit 1
}

Remove-Item Env:\MYSQL_PWD
