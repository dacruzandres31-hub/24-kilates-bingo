DELIMITER //

DROP PROCEDURE IF EXISTS sp_transfer_cards //

CREATE PROCEDURE sp_transfer_cards(
    IN p_from_user_id INT,
    IN p_to_user_id INT,
    IN p_room VARCHAR(10),
    IN p_quantity INT,
    IN p_executed_by INT
)
BEGIN
    DECLARE v_from_role VARCHAR(20);
    DECLARE v_to_role VARCHAR(20);
    DECLARE v_cards_to_deduct INT;
    DECLARE v_paid_qty INT;
    DECLARE v_gift_qty INT;

    -- Obtener roles
    SELECT role INTO v_from_role FROM users WHERE id = p_from_user_id;
    SELECT role INTO v_to_role FROM users WHERE id = p_to_user_id;

    -- Calcular split 90/10 si es Admin/Agente -> Jugador
    IF (v_from_role IN ('superadmin', 'agente', 'admin')) AND (v_to_role = 'jugador') THEN
        SET v_paid_qty = FLOOR(p_quantity * 0.9);
        SET v_gift_qty = p_quantity - v_paid_qty;
    ELSE
        -- Transferencia normal (Agente -> Agente o misma jerarquía)
        SET v_paid_qty = p_quantity;
        SET v_gift_qty = 0;
    END IF;

    START TRANSACTION;

    -- 1. DEDUCIR DEL REMITENTE (Priorizar cartones normales, luego regalo si es necesario, pero aqui asumimos normales)
    -- Simplificación: Deducir stock general. Si es admin, asumimos "normales" por defecto.
    -- Nota: El sistema previo separaba gift/normal. Vamos a deducir de 'is_gift=0' primero.
    
    UPDATE user_card_inventory 
    SET quantity = quantity - p_quantity 
    WHERE user_id = p_from_user_id AND room = p_room AND is_gift = 0;
    
    -- Verificar si se pudo deducir (si row_count = 0, tal vez no tenía normales, intentar gift?? No, transferencias son de stock vendible)
    -- Si el update dejara negativo, fallaría si tuvieramos constraints, pero aqui confiamos en la app check.
    
    -- 2. ACREDITAR AL DESTINATARIO
    
    -- 2a. Acreditar Normales
    IF v_paid_qty > 0 THEN
        INSERT INTO user_card_inventory (user_id, room, quantity, is_gift)
        VALUES (p_to_user_id, p_room, v_paid_qty, 0)
        ON DUPLICATE KEY UPDATE quantity = quantity + v_paid_qty;
    END IF;

    -- 2b. Acreditar Regalo (si aplica)
    IF v_gift_qty > 0 THEN
        INSERT INTO user_card_inventory (user_id, room, quantity, is_gift)
        VALUES (p_to_user_id, p_room, v_gift_qty, 1)
        ON DUPLICATE KEY UPDATE quantity = quantity + v_gift_qty;
    END IF;

    -- 3. LOG
    INSERT INTO card_movements_log (user_id, from_user_id, to_user_id, room, movement_type, quantity, is_gift, reason, executed_by)
    VALUES (p_to_user_id, p_from_user_id, p_to_user_id, p_room, 'transfer', p_quantity, 0, 'Transferencia manual', p_executed_by);

    COMMIT;
END //

DELIMITER ;
