# Script para aplicar migración de configuración de salas y pozos
# Fecha: 17 de Diciembre 2025

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  MIGRACIÓN: Configuración de Salas y Pozos" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# Configuración
$mysqlPath = "C:\xampp\mysql\bin\mysql.exe"
$dbName = "bingo_24k"
$user = "root"
$password = "bingo2024"
$migrationFile = "server\ROOM_SETTINGS_MIGRATION.sql"

# Verificar que existe el archivo de migración
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: No se encontró el archivo $migrationFile" -ForegroundColor Red
    exit 1
}

# Verificar que existe MySQL
if (-not (Test-Path $mysqlPath)) {
    Write-Host "❌ Error: No se encontró MySQL en $mysqlPath" -ForegroundColor Red
    Write-Host "   Verifica la ruta de instalación de XAMPP/MySQL" -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Archivo de migración: $migrationFile" -ForegroundColor Gray
Write-Host "🗄️  Base de datos: $dbName`n" -ForegroundColor Gray

try {
    Write-Host "🚀 Aplicando migración..." -ForegroundColor Yellow
    
    # Ejecutar migración
    Get-Content $migrationFile | & $mysqlPath -u $user -p$password $dbName 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ MIGRACIÓN APLICADA EXITOSAMENTE`n" -ForegroundColor Green
        
        # Verificar que se crearon las tablas y procedures
        Write-Host "🔍 Verificando cambios..." -ForegroundColor Cyan
        
        $verification = @"
SELECT 
    'Tabla room_settings' AS tipo,
    COUNT(*) AS cantidad
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = '$dbName' AND TABLE_NAME = 'room_settings'
UNION ALL
SELECT 
    'Salas configuradas',
    COUNT(*)
FROM room_settings
UNION ALL
SELECT
    'Procedures creados',
    COUNT(*)
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = '$dbName' AND ROUTINE_NAME IN ('calculate_session_pots', 'reset_session_pots_after_draw');
"@
        
        $verification | & $mysqlPath -u $user -p$password $dbName -t
        
        Write-Host "`n📊 Configuración inicial de salas:" -ForegroundColor Cyan
        
        $checkSettings = @"
SELECT 
    room AS Sala,
    CONCAT('$', FORMAT(card_price, 0)) AS Precio_Carton,
    CONCAT(percentage_linea, '%') AS LINEA,
    CONCAT(percentage_bingo, '%') AS BINGO,
    CONCAT(percentage_acumulado, '%') AS Pre_40,
    CONCAT('$', FORMAT(accumulated_pot_pre40, 0)) AS Pozo_Acumulado
FROM room_settings
ORDER BY FIELD(room, 'bronce', 'plata', 'oro');
"@
        
        $checkSettings | & $mysqlPath -u $user -p$password $dbName -t
        
        Write-Host "`n✨ Sistema de pozos configurado correctamente" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "Próximos pasos:" -ForegroundColor Yellow
        Write-Host "  1. Reiniciar el servidor backend (nodemon detectará los cambios)" -ForegroundColor White
        Write-Host "  2. Acceder al panel admin → Sesiones y Pozos → Configuración de Salas" -ForegroundColor White
        Write-Host "  3. Ajustar precios y porcentajes según sea necesario" -ForegroundColor White
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray
        
    } else {
        throw "Error al ejecutar la migración"
    }
    
} catch {
    Write-Host "`n❌ ERROR AL APLICAR MIGRACIÓN" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nRevisa el archivo de migración y la conexión a MySQL`n" -ForegroundColor Yellow
    exit 1
}
