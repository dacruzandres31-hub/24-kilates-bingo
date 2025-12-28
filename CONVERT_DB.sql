-- Convertir TODA la base de datos a utf8mb4_unicode_ci

-- Primero, cambiar el default de la base de datos
ALTER DATABASE bingo_24k CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Luego, convertir TODAS las tablas
SET @DATABASE_NAME = 'bingo_24k';
SELECT CONCAT('ALTER TABLE `', table_name, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
FROM information_schema.tables
WHERE table_schema = @DATABASE_NAME
AND table_type = 'BASE TABLE';

-- Ejecutar manualmente los ALTER TABLE generados arriba, o usar este procedimiento:
