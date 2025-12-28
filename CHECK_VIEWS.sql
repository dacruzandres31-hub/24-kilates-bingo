-- Verificar si existen las vistas necesarias para cardInventoryService

-- 1. Verificar vista v_admin_inventory
SHOW CREATE VIEW v_admin_inventory;

-- 2. Verificar vista v_superadmin_inventory  
SHOW CREATE VIEW v_superadmin_inventory;

-- 3. Si no existen, crearlas:

-- Vista para admins (solo totales)
CREATE OR REPLACE VIEW v_admin_inventory AS
SELECT 
    user_id,
    room,
    SUM(quantity) as total_quantity
FROM user_card_inventory
GROUP BY user_id, room;

-- Vista para superadmin (separado por is_gift)
CREATE OR REPLACE VIEW v_superadmin_inventory AS
SELECT 
    user_id,
    room,
    is_gift,
    quantity
FROM user_card_inventory;
