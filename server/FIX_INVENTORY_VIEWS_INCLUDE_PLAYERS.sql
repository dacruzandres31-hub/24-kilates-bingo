-- ============================================
-- FIX: Inventory Views - Incluir JUGADORES
-- ============================================
-- Problema: Las vistas solo mostraban superadmin y agentes
-- Solución: Incluir también jugadores en las vistas
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
-- CAMBIO: Incluir todos los roles (superadmin, agente, jugador)
WHERE u.role IN ('superadmin', 'agente', 'jugador')
GROUP BY u.id, u.username, u.role, uci.room
HAVING total_cards > 0
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
-- CAMBIO: Sin filtro de rol, mostrar todos los usuarios
GROUP BY u.id, u.username, u.role, uci.room
HAVING total_cards > 0
ORDER BY u.username, uci.room;

-- ========================================
-- Verificación
-- ========================================

-- Contar usuarios por rol en v_superadmin_inventory
SELECT 
  'Usuarios por rol en v_superadmin_inventory' AS descripcion,
  role,
  COUNT(DISTINCT user_id) AS cantidad
FROM v_superadmin_inventory
GROUP BY role;

-- Mostrar algunos jugadores
SELECT 
  'Ejemplo de jugadores con cartones' AS descripcion,
  user_id,
  username,
  role,
  room,
  total_cards
FROM v_superadmin_inventory
WHERE role = 'jugador'
LIMIT 5;

SELECT 'Vistas actualizadas - Ahora incluyen jugadores' AS status;
