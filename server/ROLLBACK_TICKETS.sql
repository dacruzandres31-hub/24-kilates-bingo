-- ===== ROLLBACK: Sistema de Tickets y Premios Híbridos =====
-- Este script revierte TODAS las migraciones de la versión 1.3.0
-- ADVERTENCIA: Esto eliminará TODOS los datos de tickets y eventos
-- Fecha: 2025-01-02

BEGIN;

-- Paso 1: Eliminar tablas nuevas (si existen)
DROP TABLE IF EXISTS game_events CASCADE;
DROP TABLE IF EXISTS user_tickets CASCADE;

-- Paso 2: Revertir ALTER TABLE en user_inventory
ALTER TABLE user_inventory DROP COLUMN IF EXISTS quantity;
ALTER TABLE user_inventory DROP COLUMN IF EXISTS is_consumable_type;

-- Paso 3: Revertir ALTER TABLE en cosmetic_items
ALTER TABLE cosmetic_items DROP COLUMN IF EXISTS is_consumable;
ALTER TABLE cosmetic_items DROP COLUMN IF EXISTS max_uses;
ALTER TABLE cosmetic_items DROP COLUMN IF EXISTS ticket_room;

-- Paso 4: Eliminar tickets insertados (si existen)
DELETE FROM cosmetic_items WHERE type = 'ticket';

-- Paso 5: Eliminar índices creados (si existen)
DROP INDEX IF EXISTS idx_cosmetic_items_type_room;
DROP INDEX IF EXISTS idx_user_inventory_consumable;
DROP INDEX IF EXISTS idx_game_events_user;
DROP INDEX IF EXISTS idx_game_events_session;
DROP INDEX IF EXISTS idx_user_tickets_user;
DROP INDEX IF EXISTS idx_user_tickets_consumed;

COMMIT;

-- Verificación
SELECT 'Rollback completado' as status;
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cosmetic_items' AND column_name='is_consumable') THEN '✅ is_consumable eliminado'
    ELSE '❌ is_consumable AÚN EXISTE'
  END as check1,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='game_events') THEN '✅ game_events eliminada'
    ELSE '❌ game_events AÚN EXISTE'
  END as check2,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM cosmetic_items WHERE type='ticket') THEN '✅ Tickets eliminados'
    ELSE '❌ Tickets AÚN EXISTEN'
  END as check3;
