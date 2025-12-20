-- Migración: Sistema de Bloqueo de Usuarios (Compatible)
-- Fecha: 18 de diciembre de 2025
-- Descripción: Agrega campos para bloquear usuarios con motivo y fecha

USE bingo_24k;

-- Primero verificamos si las columnas existen
SET @dbname = 'bingo_24k';
SET @tablename = 'users';

-- Agregar is_blocked
SET @columnname = 'is_blocked';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_schema=@dbname
    AND table_name=@tablename
    AND column_name=@columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar block_reason
SET @columnname = 'block_reason';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_schema=@dbname
    AND table_name=@tablename
    AND column_name=@columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN block_reason TEXT NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar blocked_at
SET @columnname = 'blocked_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_schema=@dbname
    AND table_name=@tablename
    AND column_name=@columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN blocked_at TIMESTAMP NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar blocked_by
SET @columnname = 'blocked_by';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_schema=@dbname
    AND table_name=@tablename
    AND column_name=@columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN blocked_by INT NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar índice si no existe
SET @indexname = 'idx_is_blocked';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema=@dbname
    AND table_name=@tablename
    AND index_name=@indexname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD INDEX idx_is_blocked (is_blocked)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tabla de log de bloqueos (auditoría)
CREATE TABLE IF NOT EXISTS user_blocks_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action ENUM('block', 'unblock') NOT NULL,
    reason TEXT NULL,
    performed_by INT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_performed_at (performed_at)
);

-- Vista para usuarios bloqueados (drop and recreate)
DROP VIEW IF EXISTS blocked_users;
CREATE VIEW blocked_users AS
SELECT 
    u.id,
    u.username,
    u.role,
    u.block_reason,
    u.blocked_at,
    blocker.username AS blocked_by_username
FROM users u
LEFT JOIN users blocker ON u.blocked_by = blocker.id
WHERE u.is_blocked = TRUE
ORDER BY u.blocked_at DESC;

-- Mensaje de éxito
SELECT 'Migración de bloqueo de usuarios completada exitosamente' AS mensaje;
