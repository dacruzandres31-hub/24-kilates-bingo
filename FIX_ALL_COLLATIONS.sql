-- Verificar TODAS las collations en la base de datos

SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLLATION_NAME,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'bingo_24k'
AND COLLATION_NAME = 'utf8mb4_0900_ai_ci'
ORDER BY TABLE_NAME, COLUMN_NAME;

-- Convertir TODAS las columnas que tengan utf8mb4_0900_ai_ci a utf8mb4_unicode_ci
-- Esto se hace tabla por tabla

-- Users
ALTER TABLE users 
    MODIFY COLUMN username VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN email VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN role VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN nombre_completo VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN documento VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN telefono VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN phone_number VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN cbu VARCHAR(22) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN alias VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN bank_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    MODIFY COLUMN block_reason TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Room settings
ALTER TABLE room_settings
    MODIFY COLUMN room VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Verificar que ya no queden columnas con utf8mb4_0900_ai_ci
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLLATION_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'bingo_24k'
AND COLLATION_NAME = 'utf8mb4_0900_ai_ci';
