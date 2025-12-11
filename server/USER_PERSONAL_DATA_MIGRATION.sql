-- =====================================================
-- MIGRACIÓN: Datos Personales de Usuarios (Opcional)
-- Fecha: 2025-12-11
-- Descripción: Agrega campos opcionales para datos personales
-- =====================================================

-- Agregar columnas de datos personales a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS documento VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS telefono VARCHAR(50) NULL;

-- Índice para búsqueda por email (opcional pero útil)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_documento ON users(documento);

SELECT 'Migración USER_PERSONAL_DATA completada exitosamente' AS status;
