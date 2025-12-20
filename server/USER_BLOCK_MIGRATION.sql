-- Migración: Sistema de Bloqueo de Usuarios
-- Fecha: 18 de diciembre de 2025
-- Descripción: Agrega campos para bloquear usuarios con motivo y fecha

USE bingo_24k;

-- Agregar columnas de bloqueo a la tabla users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS block_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS blocked_by INT NULL,
ADD INDEX idx_is_blocked (is_blocked);

-- Agregar clave foránea para blocked_by (opcional, puede ser NULL si fue bloqueado por sistema)
-- ALTER TABLE users
-- ADD FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL;

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

-- Vista para usuarios bloqueados
CREATE OR REPLACE VIEW blocked_users AS
SELECT 
    u.id,
    u.username,
    u.role,
    u.block_reason,
    u.blocked_at,
    blocker.username AS blocked_by_username
FROM users u
LEFT JOIN users blocker ON u.blocked_by = blocker.id
WHERE u.is_blocked = TRUE;

SELECT 'Migración de bloqueo de usuarios completada' AS resultado;
