-- ============================================
-- FIX: Inventory Views - Mostrar cartones aunque SUM sea NULL
-- ============================================
-- Problema: Usuarios con cartones de regalo no aparecían hasta
-- que se les agregaba al menos 1 cartón, porque LEFT JOIN con
-- SUM() puede retornar NULL y entonces HAVING total_cards > 0 falla
--
-- Solución: Usar COALESCE para convertir NULL a 0
-- ============================================

USE bingo_24k;

-- ========================================
-- 1. Recrear vista v_superadmin_inventory
-- ========================================

DROP VIEW IF EXISTS v_superadmin_inventory;

CREATE VIEW v_superadmin_inventory AS
SELECT 
  u.id AS user_id,
  u.username,
  u.role,
  COALESCE(uci.room, 'N/A') AS room,
  COALESCE(SUM(CASE WHEN uci.is_gift = 0 THEN uci.quantity ELSE 0 END), 0) AS normal_cards,
  COALESCE(SUM(CASE WHEN uci.is_gift = 1 THEN uci.quantity ELSE 0 END), 0) AS gift_cards,
  COALESCE(SUM(uci.quantity), 0) AS total_cards,
  ROUND(
    (COALESCE(SUM(CASE WHEN uci.is_gift = 1 THEN uci.quantity ELSE 0 END), 0) / 
     NULLIF(COALESCE(SUM(uci.quantity), 0), 0) * 100), 
    2
  ) AS free_percentage
FROM users u
LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
WHERE u.role IN ('superadmin', 'agente')
GROUP BY u.id, u.username, u.role, uci.room
HAVING total_cards > 0  -- Ahora funciona correctamente porque COALESCE garantiza que nunca sea NULL
ORDER BY u.username, uci.room;

-- ========================================
-- 2. Recrear vista v_admin_inventory
-- ========================================

DROP VIEW IF EXISTS v_admin_inventory;

CREATE VIEW v_admin_inventory AS
SELECT 
  u.id AS user_id,
  u.username,
  u.role,
  COALESCE(uci.room, 'N/A') AS room,
  COALESCE(SUM(uci.quantity), 0) AS total_cards,
  ROUND(
    (COALESCE(SUM(CASE WHEN uci.is_gift = 1 THEN uci.quantity ELSE 0 END), 0) / 
     NULLIF(COALESCE(SUM(uci.quantity), 0), 0) * 100), 
    2
  ) AS free_percentage
FROM users u
LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
GROUP BY u.id, u.username, u.role, uci.room
HAVING total_cards > 0  -- Ahora funciona correctamente
ORDER BY u.username, uci.room;

-- ========================================
-- Verificación
-- ========================================

-- Probar que ahora muestra usuarios con cartones de regalo
SELECT 
  'TEST: Usuarios con solo cartones de regalo',
  user_id,
  username,
  room,
  normal_cards,
  gift_cards,
  total_cards,
  free_percentage
FROM v_superadmin_inventory
WHERE gift_cards > 0 AND normal_cards = 0
LIMIT 5;

SELECT 'Vistas corregidas - Los cartones de regalo ahora se muestran correctamente' AS status;
