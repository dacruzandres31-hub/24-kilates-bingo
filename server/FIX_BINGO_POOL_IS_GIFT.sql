-- MIGRACIÓN: Agregar is_gift a bingo_cards_pool
-- Fecha: 22-DIC-2025
-- Descripción: Solucionar error de columna faltante para lógica de cartones de regalo

ALTER TABLE bingo_cards_pool
ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE COMMENT 'Indica si el cartón es de regalo (PLUS)';

CREATE INDEX idx_is_gift ON bingo_cards_pool(is_gift);
