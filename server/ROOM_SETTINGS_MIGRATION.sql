-- =====================================================
-- MIGRACIÓN: Configuración de Salas y Precios de Cartones
-- Fecha: 17 de Diciembre 2025
-- Propósito: Crear tabla de configuración por sala y función de cálculo de pozos
-- =====================================================

USE bingo_24k;

-- Tabla de configuración por sala
CREATE TABLE IF NOT EXISTS room_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room ENUM('bronce', 'plata', 'oro') NOT NULL UNIQUE,
    card_price DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
    
    -- Porcentajes de distribución (deben sumar <= 100)
    percentage_linea DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    percentage_bingo DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    percentage_acumulado DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    -- El resto (30%) es para la casa/comisiones
    
    -- Pozos acumulados (se incrementan entre sorteos)
    accumulated_pot_pre40 DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Metadata
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Insertar valores por defecto para las 3 salas
INSERT INTO room_settings (room, card_price, percentage_linea, percentage_bingo, percentage_acumulado, accumulated_pot_pre40) 
VALUES 
    ('bronce', 5000.00, 15.00, 50.00, 5.00, 0.00),
    ('plata', 10000.00, 15.00, 50.00, 5.00, 0.00),
    ('oro', 20000.00, 15.00, 50.00, 5.00, 0.00)
ON DUPLICATE KEY UPDATE 
    card_price = VALUES(card_price);

-- =====================================================
-- Función: Calcular pozos basados en cartones vendidos
-- =====================================================

DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS calculate_session_pots(
    IN p_session_id INT
)
BEGIN
    DECLARE v_room VARCHAR(50);
    DECLARE v_total_cards INT;
    DECLARE v_card_price DECIMAL(10,2);
    DECLARE v_total_revenue DECIMAL(10,2);
    DECLARE v_pot_linea DECIMAL(10,2);
    DECLARE v_pot_bingo DECIMAL(10,2);
    DECLARE v_pot_acumulado DECIMAL(10,2);
    DECLARE v_percentage_linea DECIMAL(5,2);
    DECLARE v_percentage_bingo DECIMAL(5,2);
    DECLARE v_percentage_acumulado DECIMAL(5,2);
    DECLARE v_accumulated_pot DECIMAL(10,2);
    
    -- Obtener datos de la sesión
    SELECT room, total_cards_sold 
    INTO v_room, v_total_cards
    FROM game_sessions 
    WHERE id = p_session_id;
    
    -- Obtener configuración de la sala
    SELECT 
        card_price,
        percentage_linea,
        percentage_bingo,
        percentage_acumulado,
        accumulated_pot_pre40
    INTO 
        v_card_price,
        v_percentage_linea,
        v_percentage_bingo,
        v_percentage_acumulado,
        v_accumulated_pot
    FROM room_settings 
    WHERE room = v_room;
    
    -- Calcular ingresos totales
    SET v_total_revenue = v_total_cards * v_card_price;
    
    -- Calcular pozos según porcentajes
    SET v_pot_linea = ROUND(v_total_revenue * (v_percentage_linea / 100), 2);
    SET v_pot_bingo = ROUND(v_total_revenue * (v_percentage_bingo / 100), 2);
    SET v_pot_acumulado = ROUND(v_total_revenue * (v_percentage_acumulado / 100), 2);
    
    -- Actualizar pozos en la sesión
    UPDATE game_sessions 
    SET 
        current_pot_linea = v_pot_linea,
        current_pot_bingo = v_pot_bingo,
        current_pot_jackpot = v_accumulated_pot + v_pot_acumulado,
        total_revenue = v_total_revenue
    WHERE id = p_session_id;
    
    -- Incrementar pozo acumulado de la sala
    UPDATE room_settings 
    SET accumulated_pot_pre40 = accumulated_pot_pre40 + v_pot_acumulado
    WHERE room = v_room;
    
END$$

DELIMITER ;

-- =====================================================
-- Trigger: Actualizar pozos automáticamente al vender cartón
-- =====================================================

DELIMITER $$

CREATE TRIGGER IF NOT EXISTS update_pots_on_card_sale
AFTER UPDATE ON game_sessions
FOR EACH ROW
BEGIN
    -- Solo recalcular si cambió la cantidad de cartones vendidos
    IF NEW.total_cards_sold != OLD.total_cards_sold THEN
        CALL calculate_session_pots(NEW.id);
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- Función: Reiniciar pozos después de sorteo
-- =====================================================

DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS reset_session_pots_after_draw(
    IN p_session_id INT
)
BEGIN
    DECLARE v_room VARCHAR(50);
    DECLARE v_pot_acumulado DECIMAL(10,2);
    
    -- Obtener sala y pozo acumulado
    SELECT room, current_pot_jackpot 
    INTO v_room, v_pot_acumulado
    FROM game_sessions 
    WHERE id = p_session_id;
    
    -- Resetear pozos de LÍNEA y BINGO a 0 (ya se entregaron)
    UPDATE game_sessions 
    SET 
        current_pot_linea = 0.00,
        current_pot_bingo = 0.00,
        status = 'completed'
    WHERE id = p_session_id;
    
    -- El pozo acumulado ya está en room_settings, NO se resetea
    
END$$

DELIMITER ;

-- =====================================================
-- Índices para optimización
-- =====================================================

CREATE INDEX idx_game_sessions_room ON game_sessions(room);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);

-- =====================================================
-- Verificación
-- =====================================================

SELECT 
    '✅ Migración completada' AS status,
    (SELECT COUNT(*) FROM room_settings) AS salas_configuradas,
    (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_NAME = 'calculate_session_pots') AS procedures_creados;
