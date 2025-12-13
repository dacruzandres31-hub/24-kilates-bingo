-- =====================================================
-- MIGRACIÓN: Datos Personales de Usuarios (Opcional)
-- Fecha: 2025-12-11
-- Descripción: Agrega campos opcionales para datos personales
-- =====================================================

-- Agregar columnas de datos personales a la tabla users
-- MySQL no soporta IF NOT EXISTS en ALTER TABLE, usamos procedimiento almacenado

DELIMITER $$

DROP PROCEDURE IF EXISTS add_user_personal_fields$$
CREATE PROCEDURE add_user_personal_fields()
BEGIN
    -- Verificar y agregar nombre_completo
    IF NOT EXISTS(
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = 'bingo_24k' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'nombre_completo'
    ) THEN
        ALTER TABLE users ADD COLUMN nombre_completo VARCHAR(255) NULL;
    END IF;
    
    -- Verificar y agregar documento
    IF NOT EXISTS(
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = 'bingo_24k' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'documento'
    ) THEN
        ALTER TABLE users ADD COLUMN documento VARCHAR(50) NULL;
    END IF;
    
    -- Verificar y agregar email
    IF NOT EXISTS(
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = 'bingo_24k' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL;
    END IF;
    
    -- Verificar y agregar telefono
    IF NOT EXISTS(
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = 'bingo_24k' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'telefono'
    ) THEN
        ALTER TABLE users ADD COLUMN telefono VARCHAR(50) NULL;
    END IF;
END$$

DELIMITER ;

-- Ejecutar el procedimiento
CALL add_user_personal_fields();

-- Limpiar
DROP PROCEDURE IF EXISTS add_user_personal_fields;

-- Crear índices (ignorar error si ya existen)
-- MySQL 8.0 soporta CREATE INDEX IF NOT EXISTS pero con sintaxis específica
SET @sql1 = 'CREATE INDEX idx_users_email ON users(email)';
SET @sql2 = 'CREATE INDEX idx_users_documento ON users(documento)';

-- Intentar crear índice email
SET @index_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = 'bingo_24k' AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_email');
SET @sql1 = IF(@index_exists > 0, 'SELECT "Index idx_users_email already exists"', @sql1);
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Intentar crear índice documento
SET @index_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = 'bingo_24k' AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_documento');
SET @sql2 = IF(@index_exists > 0, 'SELECT "Index idx_users_documento already exists"', @sql2);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SELECT 'Migración USER_PERSONAL_DATA completada exitosamente' AS status;
