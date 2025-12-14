# Script para aplicar migración de gift_cards a MySQL
# Fecha: 13-DIC-2025

Write-Host "🚀 Aplicando migración de Gift Cards..." -ForegroundColor Cyan

$migrationSQL = @"
-- Agregar columnas de cartones de regalo a users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gift_cards_bronce INT DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS gift_cards_plata INT DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS gift_cards_oro INT DEFAULT 0 NOT NULL;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_gift_cards_bronce ON users(gift_cards_bronce);
CREATE INDEX IF NOT EXISTS idx_gift_cards_plata ON users(gift_cards_plata);
CREATE INDEX IF NOT EXISTS idx_gift_cards_oro ON users(gift_cards_oro);

-- Modificar game_cards para rastrear cartones de regalo
ALTER TABLE game_cards
ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE;

-- Crear tabla de movimientos
CREATE TABLE IF NOT EXISTS gift_cards_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  admin_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  quantity INT NOT NULL,
  movement_type ENUM('add', 'remove', 'used') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_movements (user_id, created_at),
  INDEX idx_admin_movements (admin_id, created_at),
  INDEX idx_room (room)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"@

# Guardar SQL temporal
$tempFile = "c:\Users\User\Documents\24 kilates\temp_gift_migration.sql"
$migrationSQL | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "`n📝 Ejecutando migración..." -ForegroundColor Yellow
mysql -u root -p bingo_24k < $tempFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migración aplicada exitosamente!" -ForegroundColor Green
    
    # Verificar
    Write-Host "`n🔍 Verificando columnas agregadas:" -ForegroundColor Cyan
    $verify = @"
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'bingo_24k' 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME LIKE 'gift_cards%';
"@
    mysql -u root -p bingo_24k -e "$verify"
    
    # Limpiar archivo temporal
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}
else {
    Write-Host "`n❌ Error aplicando migración" -ForegroundColor Red
}
