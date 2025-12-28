$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CREAR VISTAS DE INVENTARIO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$password = "bingo2024"

Write-Host "Creando vistas de inventario..." -ForegroundColor Yellow
Write-Host ""

# SQL para crear las vistas
$sql = @"
-- Vista para admins (solo totales)
CREATE OR REPLACE VIEW v_admin_inventory AS
SELECT 
    user_id,
    room,
    SUM(quantity) as total_quantity
FROM user_card_inventory
GROUP BY user_id, room;

-- Vista para superadmin (separado por is_gift)
CREATE OR REPLACE VIEW v_superadmin_inventory AS
SELECT 
    user_id,
    room,
    is_gift,
    quantity
FROM user_card_inventory;

-- Verificar que se crearon
SHOW TABLES LIKE 'v_%';
"@

# Ejecutar SQL
$env:MYSQL_PWD = $password
$sql | & $mysqlPath -u root bingo_24k 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ">>> VISTAS CREADAS <<<" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vistas creadas exitosamente." -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host "ERROR CREANDO VISTAS" -ForegroundColor Red
}

Remove-Item Env:\MYSQL_PWD
