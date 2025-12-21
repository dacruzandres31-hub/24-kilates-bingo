-- ==============================================================================
-- MIGRACIÓN: Agregar columnas ticket_room para especificar qué tipo de tickets
-- se otorgan como premios en la Sala Starter
-- ==============================================================================

USE bingo_24k;

-- Agregar columnas para especificar el tipo de ticket para cada premio
ALTER TABLE starter_room_config
  ADD COLUMN ticket_room_linea ENUM('bronce', 'plata', 'oro') DEFAULT 'bronce' 
    COMMENT 'Tipo de ticket para premio de Línea' AFTER prizes_linea,
  ADD COLUMN ticket_room_bingo ENUM('bronce', 'plata', 'oro') DEFAULT 'oro' 
    COMMENT 'Tipo de ticket para premio de Bingo' AFTER prizes_bingo;

-- Actualizar configuración existente con valores por defecto
UPDATE starter_room_config
SET 
  ticket_room_linea = 'bronce',
  ticket_room_bingo = 'oro'
WHERE ticket_room_linea IS NULL OR ticket_room_bingo IS NULL;

-- Recrear la vista para incluir los nuevos campos
DROP VIEW IF EXISTS v_starter_config;

CREATE VIEW v_starter_config AS
SELECT 
  src.id,
  src.prizes_linea,
  src.ticket_room_linea,
  src.prizes_bingo,
  src.ticket_room_bingo,
  src.updated_by,
  src.updated_at,
  processor.username AS updated_by_name
FROM starter_room_config src
LEFT JOIN users processor ON src.updated_by = processor.id
ORDER BY src.id DESC
LIMIT 1;

SELECT 'Migración completada: Columnas ticket_room agregadas exitosamente' AS resultado;
