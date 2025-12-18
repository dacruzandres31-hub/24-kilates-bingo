# Script PowerShell: Aplicar Migración de Horarios de Sorteos
# Fecha: 17 de Diciembre 2025
# Descripción: Ejecuta SCHEDULE_MIGRATION.sql

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   MIGRACIÓN: Horarios de Sorteos" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$migrationFile = ".\server\SCHEDULE_MIGRATION.sql"
$dbName = "bingo_24k"

# Verificar que existe el archivo de migración
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ ERROR: No se encuentra el archivo $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Archivo de migración encontrado: $migrationFile" -ForegroundColor Green

# Verificar MySQL
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysqlPath)) {
    Write-Host "❌ ERROR: MySQL no encontrado en $mysqlPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ MySQL encontrado" -ForegroundColor Green
Write-Host "`n🔄 Ejecutando migración...`n" -ForegroundColor Yellow

# Ejecutar migración
try {
    Get-Content $migrationFile | & $mysqlPath -u root -p $dbName
    
    Write-Host "`n✅ MIGRACIÓN APLICADA EXITOSAMENTE`n" -ForegroundColor Green
    
    # Verificar instalación
    Write-Host "📊 Verificando instalación...`n" -ForegroundColor Cyan
    
    $verification = @"
SELECT 'Tabla schedule_settings:' AS info, COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA='$dbName' AND TABLE_NAME='schedule_settings'
UNION ALL
SELECT 'Horarios Starter:', COUNT(*) FROM schedule_settings WHERE room='starter'
UNION ALL
SELECT 'Horarios Bronce:', COUNT(*) FROM schedule_settings WHERE room='bronce'
UNION ALL
SELECT 'Horarios Plata:', COUNT(*) FROM schedule_settings WHERE room='plata'
UNION ALL
SELECT 'Horarios Oro:', COUNT(*) FROM schedule_settings WHERE room='oro'
UNION ALL
SELECT 'Procedures creados:', COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA='$dbName' AND ROUTINE_NAME='get_next_draws';
"@
    
    $verification | & $mysqlPath -u root -p $dbName -t
    
    Write-Host "`n📋 Horarios configurados por sala:`n" -ForegroundColor Cyan
    
    $showSchedules = @"
SELECT 
    room AS Sala,
    COUNT(*) AS Sorteos_Semanales,
    GROUP_CONCAT(DISTINCT DATE_FORMAT(hour, '%H:%i') ORDER BY hour SEPARATOR ', ') AS Horarios
FROM schedule_settings
WHERE is_active = TRUE
GROUP BY room
ORDER BY FIELD(room, 'starter', 'bronce', 'plata', 'oro');
"@
    
    $showSchedules | & $mysqlPath -u root -p $dbName -t
    
    Write-Host "`n🎉 Sistema de horarios listo para usar" -ForegroundColor Green
    Write-Host "   - Starter: 21 sorteos/día (cada hora 23:00-19:00)" -ForegroundColor White
    Write-Host "   - Bronce: 1 sorteo/día (20:00)" -ForegroundColor White
    Write-Host "   - Plata: 1 sorteo/día (21:00)" -ForegroundColor White
    Write-Host "   - Oro: 1 sorteo/día (22:00)`n" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ ERROR al aplicar migración:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
