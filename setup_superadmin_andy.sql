-- ============================================
-- CONFIGURACIÓN: Andy como único SuperAdmin
-- ============================================

-- 1. Ver estado actual de usuarios
SELECT id, username, role, parent_id, balance 
FROM users 
ORDER BY id;

-- 2. Actualizar Andy como SuperAdmin (sin parent)
UPDATE users 
SET role = 'superadmin', 
    parent_id = NULL 
WHERE username = 'Andy';

-- 3. Cambiar admin a agente y hacerlo hijo de Andy
UPDATE users 
SET role = 'agente',
    parent_id = (SELECT id FROM users WHERE username = 'Andy')
WHERE username = 'admin';

-- 4. Actualizar todos los demás usuarios que tengan parent_id = admin
-- para que ahora dependan de Andy
UPDATE users 
SET parent_id = (SELECT id FROM users WHERE username = 'Andy')
WHERE parent_id = (SELECT id FROM users WHERE username = 'admin')
  AND username != 'admin';

-- 5. Asignar balance inicial a Andy si no tiene
UPDATE users 
SET balance = COALESCE(balance, 0) + 10000000
WHERE username = 'Andy' AND balance < 1000000;

-- 6. Verificar la nueva estructura
SELECT 
    u.id,
    u.username,
    u.role,
    u.parent_id,
    p.username as parent_username,
    u.balance,
    u.cards_bronce,
    u.cards_plata,
    u.cards_oro
FROM users u
LEFT JOIN users p ON u.parent_id = p.id
ORDER BY 
    CASE WHEN u.parent_id IS NULL THEN 0 ELSE 1 END,
    u.parent_id,
    u.username;
