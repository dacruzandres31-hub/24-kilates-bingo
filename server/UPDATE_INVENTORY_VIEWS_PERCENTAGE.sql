-- ========================================
-- MIGRACIÓN: Actualizar vistas con porcentaje de cartones gratis
-- Fecha: 2025-12-13
-- Descripción: Agregar columna free_percentage a las vistas de inventario
-- ========================================

USE bingo_24k;

-- ========================================
-- 1. Recrear vista v_superadmin_inventory
-- ========================================

DROP VIEW IF EXISTS v_superadmin_inventory;

CREATE VIEW v_superadmin_inventory AS
SELECT 
  user_id,
  room,
  SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END) AS normal_cards,
  SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) AS gift_cards,
  SUM(quantity) AS total_cards,
  ROUND(
    (SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) / 
     NULLIF(SUM(quantity), 0) * 100), 
    2
  ) AS free_percentage
FROM user_card_inventory
GROUP BY user_id, room;

-- ========================================
-- 2. Recrear vista v_admin_inventory
-- ========================================

DROP VIEW IF EXISTS v_admin_inventory;

CREATE VIEW v_admin_inventory AS
SELECT 
  u.id AS user_id,
  u.username,
  u.role,
  uci.room,
  SUM(uci.quantity) AS total_cards,
  ROUND(
    (SUM(CASE WHEN uci.is_gift = 1 THEN uci.quantity ELSE 0 END) / 
     NULLIF(SUM(uci.quantity), 0) * 100), 
    2
  ) AS free_percentage
FROM users u
LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
GROUP BY u.id, u.username, u.role, uci.room
HAVING total_cards > 0
ORDER BY u.username, uci.room;

-- ========================================
-- Verificación
-- ========================================

-- Mostrar estructura de v_superadmin_inventory
SELECT 
  'v_superadmin_inventory',
  user_id,
  room,
  normal_cards,
  gift_cards,
  total_cards,
  free_percentage,
  CASE 
    WHEN free_percentage <= 10 THEN '✅ COMPLIANT'
    ELSE '⚠️ EXCEEDS 10%'
  END AS compliance_status
FROM v_superadmin_inventory
LIMIT 5;

-- Mostrar estructura de v_admin_inventory
SELECT 
  'v_admin_inventory',
  user_id,
  username,
  room,
  total_cards,
  free_percentage,
  CASE 
    WHEN free_percentage <= 10 THEN '✅ COMPLIANT'
    ELSE '⚠️ EXCEEDS 10%'
  END AS compliance_status
FROM v_admin_inventory
LIMIT 5;

SELECT 'Vistas actualizadas con free_percentage' AS status;
