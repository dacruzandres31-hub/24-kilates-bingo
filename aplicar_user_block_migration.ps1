# Aplicar migración del sistema de bloqueo de usuarios
# Fecha: 18 de diciembre de 2025

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "MIGRACION: Sistema de Bloqueo de Usuarios" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$dbName = "bingo_24k"
$sqlFile = "server\USER_BLOCK_MIGRATION.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "[ERROR] Archivo de migracion no encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "[1] Aplicando migracion a la base de datos..." -ForegroundColor Yellow
Write-Host ""

try {
    Get-Content $sqlFile | mysql -u root -p $dbName
    
    Write-Host "[OK] Migracion aplicada exitosamente" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Cambios aplicados:" -ForegroundColor Cyan
    Write-Host "  - Columnas agregadas a 'users':" -ForegroundColor White
    Write-Host "    * is_blocked (BOOLEAN)" -ForegroundColor Gray
    Write-Host "    * block_reason (TEXT)" -ForegroundColor Gray
    Write-Host "    * blocked_at (TIMESTAMP)" -ForegroundColor Gray
    Write-Host "    * blocked_by (INT)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  - Tabla creada: 'user_blocks_log'" -ForegroundColor White
    Write-Host "    * id, user_id, action, reason, performed_by, performed_at" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  - Vista creada: 'blocked_users'" -ForegroundColor White
    Write-Host "    * Lista de todos los usuarios bloqueados" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "[2] Verificando estructura..." -ForegroundColor Yellow
    
    # Verificar tabla users
    $usersCols = mysql -u root -p -e "DESCRIBE users;" $dbName 2>&1
    if ($usersCols -match "is_blocked") {
        Write-Host "[OK] Columna 'is_blocked' creada en 'users'" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Columna 'is_blocked' no encontrada" -ForegroundColor Red
    }
    
    # Verificar tabla log
    $logTable = mysql -u root -p -e "SHOW TABLES LIKE 'user_blocks_log';" $dbName 2>&1
    if ($logTable -match "user_blocks_log") {
        Write-Host "[OK] Tabla 'user_blocks_log' creada" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Tabla 'user_blocks_log' no encontrada" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "MIGRACION COMPLETADA" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Siguiente paso:" -ForegroundColor Yellow
    Write-Host "  Reiniciar servidor backend: npm run dev -w server" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "[ERROR] Fallo al aplicar migracion: $_" -ForegroundColor Red
    exit 1
}
