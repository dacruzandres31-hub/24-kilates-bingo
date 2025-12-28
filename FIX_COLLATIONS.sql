-- Script para estandarizar collations en la base de datos

-- 1. Verificar collations actuales
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLLATION_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'bingo_24k'
AND COLLATION_NAME IS NOT NULL
AND TABLE_NAME IN ('user_card_inventory', 'users', 'room_settings', 'card_movements_log')
ORDER BY TABLE_NAME, COLUMN_NAME;

-- 2. Convertir todas las tablas a utf8mb4_unicode_ci
ALTER TABLE user_card_inventory CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE room_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE card_movements_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE game_sessions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Verificar que se aplicaron los cambios
SELECT 
    TABLE_NAME,
    TABLE_COLLATION
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'bingo_24k'
AND TABLE_NAME IN ('user_card_inventory', 'users', 'room_settings', 'card_movements_log', 'game_sessions')
ORDER BY TABLE_NAME;
