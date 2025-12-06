# ===== INSTALADOR DEL SISTEMA DE TICKETS Y PREMIOS HÍBRIDOS =====
# Este script ejecuta todas las migraciones necesarias
# Versión: 1.3.0
# Fecha: 2025-01-02

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "INSTALADOR: Sistema de Tickets v1.3.0" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuración de la base de datos
$DB_NAME = "bingo_24k"
$DB_USER = "postgres"
$DB_HOST = "localhost"
$DB_PORT = "5432"

# Archivos de migración
$MIGRATION_FILE = "TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql"
$COSMETICS_FILE = "cosmetics_seed.sql"

# Paso 1: Verificar que psql está disponible
Write-Host "[1/5] Verificando PostgreSQL..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "  ✅ PostgreSQL encontrado: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ ERROR: psql no encontrado. Instala PostgreSQL y agrega psql al PATH" -ForegroundColor Red
    exit 1
}

# Paso 2: Verificar archivos de migración
Write-Host "`n[2/5] Verificando archivos de migración..." -ForegroundColor Yellow
if (-Not (Test-Path $MIGRATION_FILE)) {
    Write-Host "  ❌ ERROR: Archivo $MIGRATION_FILE no encontrado" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ $MIGRATION_FILE encontrado" -ForegroundColor Green

if (-Not (Test-Path $COSMETICS_FILE)) {
    Write-Host "  ❌ ERROR: Archivo $COSMETICS_FILE no encontrado" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ $COSMETICS_FILE encontrado" -ForegroundColor Green

# Paso 3: Solicitar confirmación
Write-Host "`n[3/5] Configuración:" -ForegroundColor Yellow
Write-Host "  Base de datos: $DB_NAME" -ForegroundColor White
Write-Host "  Usuario: $DB_USER" -ForegroundColor White
Write-Host "  Host: $DB_HOST" -ForegroundColor White
Write-Host "  Puerto: $DB_PORT" -ForegroundColor White
Write-Host "`n  Archivo 1: $MIGRATION_FILE" -ForegroundColor White
Write-Host "  Archivo 2: $COSMETICS_FILE" -ForegroundColor White

$confirmation = Read-Host "`n¿Continuar con la instalación? (S/N)"
if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host "`n⚠️  Instalación cancelada por el usuario" -ForegroundColor Yellow
    exit 0
}

# Paso 4: Ejecutar migración principal
Write-Host "`n[4/5] Ejecutando migración de tickets..." -ForegroundColor Yellow
$env:PGPASSWORD = Read-Host "Ingresa la contraseña de PostgreSQL" -AsSecureString | ConvertFrom-SecureString -AsPlainText

try {
    $result = psql -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT -f $MIGRATION_FILE 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Migración ejecutada exitosamente" -ForegroundColor Green
    } else {
        Write-Host "  ❌ ERROR al ejecutar migración:" -ForegroundColor Red
        Write-Host "  $result" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ❌ ERROR: No se pudo conectar a la base de datos" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Red
    exit 1
}

# Paso 5: Insertar cosméticos (si aún no existen)
Write-Host "`n[5/5] Insertando datos de cosméticos..." -ForegroundColor Yellow
try {
    $result = psql -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT -f $COSMETICS_FILE 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Cosméticos insertados exitosamente" -ForegroundColor Green
    } else {
        # Si hay error, probablemente ya existen los datos
        Write-Host "  ⚠️  Advertencia: Algunos cosméticos ya pueden existir" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Advertencia: Error al insertar cosméticos (pueden ya existir)" -ForegroundColor Yellow
}

# Verificación final
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN FINAL" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Verificando tablas creadas..." -ForegroundColor Yellow
$verification = @"
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cosmetic_items' AND column_name='is_consumable') THEN '✅ cosmetic_items.is_consumable'
    ELSE '❌ cosmetic_items.is_consumable'
  END as check1,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_inventory' AND column_name='quantity') THEN '✅ user_inventory.quantity'
    ELSE '❌ user_inventory.quantity'
  END as check2,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='game_events') THEN '✅ game_events tabla'
    ELSE '❌ game_events tabla'
  END as check3,
  CASE 
    WHEN EXISTS (SELECT 1 FROM cosmetic_items WHERE type='ticket') THEN '✅ Tickets insertados'
    ELSE '❌ Tickets NO encontrados'
  END as check4;
"@

$verificationResult = psql -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT -t -c $verification 2>&1

Write-Host $verificationResult

# Contar tickets disponibles
Write-Host "`nContando tickets en base de datos..." -ForegroundColor Yellow
$ticketCount = psql -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT -t -c "SELECT COUNT(*) FROM cosmetic_items WHERE type='ticket';" 2>&1
Write-Host "  📊 Total de tickets: $ticketCount" -ForegroundColor Cyan

# Limpiar variable de contraseña
$env:PGPASSWORD = $null

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ INSTALACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "🔹 SIGUIENTES PASOS:" -ForegroundColor Cyan
Write-Host "  1. Iniciar el servidor backend: cd server && npm run dev" -ForegroundColor White
Write-Host "  2. Revisar la guía de testing: TESTING_MANUAL_TICKETS.md" -ForegroundColor White
Write-Host "  3. Ejecutar los 7 tests de endpoints con curl" -ForegroundColor White
Write-Host "  4. Probar la interfaz ShopScreen en el navegador`n" -ForegroundColor White
