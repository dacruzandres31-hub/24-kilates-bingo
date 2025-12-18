-- =====================================================
-- MIGRACIÓN: Sistema de Horarios de Sorteos
-- Fecha: 17 de Diciembre 2025
-- Descripción: Horarios fijos por sala (Starter, Bronce, Plata, Oro)
-- =====================================================

-- Tabla: schedule_settings
-- Almacena horarios de sorteos configurables por sala
CREATE TABLE IF NOT EXISTS schedule_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room ENUM('starter', 'bronce', 'plata', 'oro') NOT NULL,
    day_of_week TINYINT NOT NULL COMMENT '0=Domingo, 1=Lunes, ..., 6=Sábado',
    hour TIME NOT NULL COMMENT 'Hora del sorteo (HH:MM:SS)',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Si está activo el sorteo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_room_day_hour (room, day_of_week, hour)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar horarios iniciales para Sala Starter
-- Sortea cada hora desde 23:00 hasta 19:00 (todos los días)
INSERT INTO schedule_settings (room, day_of_week, hour, is_active) VALUES
-- Lunes (1)
('starter', 1, '23:00:00', TRUE),
('starter', 1, '00:00:00', TRUE),
('starter', 1, '01:00:00', TRUE),
('starter', 1, '02:00:00', TRUE),
('starter', 1, '03:00:00', TRUE),
('starter', 1, '04:00:00', TRUE),
('starter', 1, '05:00:00', TRUE),
('starter', 1, '06:00:00', TRUE),
('starter', 1, '07:00:00', TRUE),
('starter', 1, '08:00:00', TRUE),
('starter', 1, '09:00:00', TRUE),
('starter', 1, '10:00:00', TRUE),
('starter', 1, '11:00:00', TRUE),
('starter', 1, '12:00:00', TRUE),
('starter', 1, '13:00:00', TRUE),
('starter', 1, '14:00:00', TRUE),
('starter', 1, '15:00:00', TRUE),
('starter', 1, '16:00:00', TRUE),
('starter', 1, '17:00:00', TRUE),
('starter', 1, '18:00:00', TRUE),
('starter', 1, '19:00:00', TRUE),

-- Martes (2)
('starter', 2, '23:00:00', TRUE),
('starter', 2, '00:00:00', TRUE),
('starter', 2, '01:00:00', TRUE),
('starter', 2, '02:00:00', TRUE),
('starter', 2, '03:00:00', TRUE),
('starter', 2, '04:00:00', TRUE),
('starter', 2, '05:00:00', TRUE),
('starter', 2, '06:00:00', TRUE),
('starter', 2, '07:00:00', TRUE),
('starter', 2, '08:00:00', TRUE),
('starter', 2, '09:00:00', TRUE),
('starter', 2, '10:00:00', TRUE),
('starter', 2, '11:00:00', TRUE),
('starter', 2, '12:00:00', TRUE),
('starter', 2, '13:00:00', TRUE),
('starter', 2, '14:00:00', TRUE),
('starter', 2, '15:00:00', TRUE),
('starter', 2, '16:00:00', TRUE),
('starter', 2, '17:00:00', TRUE),
('starter', 2, '18:00:00', TRUE),
('starter', 2, '19:00:00', TRUE),

-- Miércoles (3)
('starter', 3, '23:00:00', TRUE),
('starter', 3, '00:00:00', TRUE),
('starter', 3, '01:00:00', TRUE),
('starter', 3, '02:00:00', TRUE),
('starter', 3, '03:00:00', TRUE),
('starter', 3, '04:00:00', TRUE),
('starter', 3, '05:00:00', TRUE),
('starter', 3, '06:00:00', TRUE),
('starter', 3, '07:00:00', TRUE),
('starter', 3, '08:00:00', TRUE),
('starter', 3, '09:00:00', TRUE),
('starter', 3, '10:00:00', TRUE),
('starter', 3, '11:00:00', TRUE),
('starter', 3, '12:00:00', TRUE),
('starter', 3, '13:00:00', TRUE),
('starter', 3, '14:00:00', TRUE),
('starter', 3, '15:00:00', TRUE),
('starter', 3, '16:00:00', TRUE),
('starter', 3, '17:00:00', TRUE),
('starter', 3, '18:00:00', TRUE),
('starter', 3, '19:00:00', TRUE),

-- Jueves (4)
('starter', 4, '23:00:00', TRUE),
('starter', 4, '00:00:00', TRUE),
('starter', 4, '01:00:00', TRUE),
('starter', 4, '02:00:00', TRUE),
('starter', 4, '03:00:00', TRUE),
('starter', 4, '04:00:00', TRUE),
('starter', 4, '05:00:00', TRUE),
('starter', 4, '06:00:00', TRUE),
('starter', 4, '07:00:00', TRUE),
('starter', 4, '08:00:00', TRUE),
('starter', 4, '09:00:00', TRUE),
('starter', 4, '10:00:00', TRUE),
('starter', 4, '11:00:00', TRUE),
('starter', 4, '12:00:00', TRUE),
('starter', 4, '13:00:00', TRUE),
('starter', 4, '14:00:00', TRUE),
('starter', 4, '15:00:00', TRUE),
('starter', 4, '16:00:00', TRUE),
('starter', 4, '17:00:00', TRUE),
('starter', 4, '18:00:00', TRUE),
('starter', 4, '19:00:00', TRUE),

-- Viernes (5)
('starter', 5, '23:00:00', TRUE),
('starter', 5, '00:00:00', TRUE),
('starter', 5, '01:00:00', TRUE),
('starter', 5, '02:00:00', TRUE),
('starter', 5, '03:00:00', TRUE),
('starter', 5, '04:00:00', TRUE),
('starter', 5, '05:00:00', TRUE),
('starter', 5, '06:00:00', TRUE),
('starter', 5, '07:00:00', TRUE),
('starter', 5, '08:00:00', TRUE),
('starter', 5, '09:00:00', TRUE),
('starter', 5, '10:00:00', TRUE),
('starter', 5, '11:00:00', TRUE),
('starter', 5, '12:00:00', TRUE),
('starter', 5, '13:00:00', TRUE),
('starter', 5, '14:00:00', TRUE),
('starter', 5, '15:00:00', TRUE),
('starter', 5, '16:00:00', TRUE),
('starter', 5, '17:00:00', TRUE),
('starter', 5, '18:00:00', TRUE),
('starter', 5, '19:00:00', TRUE),

-- Sábado (6)
('starter', 6, '23:00:00', TRUE),
('starter', 6, '00:00:00', TRUE),
('starter', 6, '01:00:00', TRUE),
('starter', 6, '02:00:00', TRUE),
('starter', 6, '03:00:00', TRUE),
('starter', 6, '04:00:00', TRUE),
('starter', 6, '05:00:00', TRUE),
('starter', 6, '06:00:00', TRUE),
('starter', 6, '07:00:00', TRUE),
('starter', 6, '08:00:00', TRUE),
('starter', 6, '09:00:00', TRUE),
('starter', 6, '10:00:00', TRUE),
('starter', 6, '11:00:00', TRUE),
('starter', 6, '12:00:00', TRUE),
('starter', 6, '13:00:00', TRUE),
('starter', 6, '14:00:00', TRUE),
('starter', 6, '15:00:00', TRUE),
('starter', 6, '16:00:00', TRUE),
('starter', 6, '17:00:00', TRUE),
('starter', 6, '18:00:00', TRUE),
('starter', 6, '19:00:00', TRUE),

-- Domingo (0)
('starter', 0, '23:00:00', TRUE),
('starter', 0, '00:00:00', TRUE),
('starter', 0, '01:00:00', TRUE),
('starter', 0, '02:00:00', TRUE),
('starter', 0, '03:00:00', TRUE),
('starter', 0, '04:00:00', TRUE),
('starter', 0, '05:00:00', TRUE),
('starter', 0, '06:00:00', TRUE),
('starter', 0, '07:00:00', TRUE),
('starter', 0, '08:00:00', TRUE),
('starter', 0, '09:00:00', TRUE),
('starter', 0, '10:00:00', TRUE),
('starter', 0, '11:00:00', TRUE),
('starter', 0, '12:00:00', TRUE),
('starter', 0, '13:00:00', TRUE),
('starter', 0, '14:00:00', TRUE),
('starter', 0, '15:00:00', TRUE),
('starter', 0, '16:00:00', TRUE),
('starter', 0, '17:00:00', TRUE),
('starter', 0, '18:00:00', TRUE),
('starter', 0, '19:00:00', TRUE);

-- Insertar horarios para Sala Bronce
-- Sortea a las 20:00 todos los días
INSERT INTO schedule_settings (room, day_of_week, hour, is_active) VALUES
('bronce', 0, '20:00:00', TRUE), -- Domingo
('bronce', 1, '20:00:00', TRUE), -- Lunes
('bronce', 2, '20:00:00', TRUE), -- Martes
('bronce', 3, '20:00:00', TRUE), -- Miércoles
('bronce', 4, '20:00:00', TRUE), -- Jueves
('bronce', 5, '20:00:00', TRUE), -- Viernes
('bronce', 6, '20:00:00', TRUE); -- Sábado

-- Insertar horarios para Sala Plata
-- Sortea a las 21:00 todos los días
INSERT INTO schedule_settings (room, day_of_week, hour, is_active) VALUES
('plata', 0, '21:00:00', TRUE), -- Domingo
('plata', 1, '21:00:00', TRUE), -- Lunes
('plata', 2, '21:00:00', TRUE), -- Martes
('plata', 3, '21:00:00', TRUE), -- Miércoles
('plata', 4, '21:00:00', TRUE), -- Jueves
('plata', 5, '21:00:00', TRUE), -- Viernes
('plata', 6, '21:00:00', TRUE); -- Sábado

-- Insertar horarios para Sala Oro
-- Sortea a las 22:00 todos los días
INSERT INTO schedule_settings (room, day_of_week, hour, is_active) VALUES
('oro', 0, '22:00:00', TRUE), -- Domingo
('oro', 1, '22:00:00', TRUE), -- Lunes
('oro', 2, '22:00:00', TRUE), -- Martes
('oro', 3, '22:00:00', TRUE), -- Miércoles
('oro', 4, '22:00:00', TRUE), -- Jueves
('oro', 5, '22:00:00', TRUE), -- Viernes
('oro', 6, '22:00:00', TRUE); -- Sábado

-- Índices para mejorar rendimiento
CREATE INDEX idx_room_active ON schedule_settings(room, is_active);
CREATE INDEX idx_day_hour ON schedule_settings(day_of_week, hour);

-- =====================================================
-- PROCEDURE: Obtener próximos sorteos por sala
-- =====================================================
DELIMITER //

CREATE PROCEDURE get_next_draws(
    IN p_room VARCHAR(50),
    IN p_limit INT
)
BEGIN
    DECLARE v_current_day TINYINT;
    DECLARE v_current_time TIME;
    
    SET v_current_day = DAYOFWEEK(NOW()) - 1; -- MySQL DAYOFWEEK: 1=Domingo, ajustamos a 0=Domingo
    SET v_current_time = CURTIME();
    
    -- Obtener próximos sorteos (hoy + próximos 7 días)
    SELECT 
        room,
        day_of_week,
        hour,
        is_active,
        CASE 
            WHEN day_of_week = v_current_day AND hour > v_current_time THEN 0 -- Hoy
            WHEN day_of_week > v_current_day THEN day_of_week - v_current_day
            ELSE 7 - v_current_day + day_of_week
        END AS days_until,
        CONCAT(
            CASE day_of_week
                WHEN 0 THEN 'Domingo'
                WHEN 1 THEN 'Lunes'
                WHEN 2 THEN 'Martes'
                WHEN 3 THEN 'Miércoles'
                WHEN 4 THEN 'Jueves'
                WHEN 5 THEN 'Viernes'
                WHEN 6 THEN 'Sábado'
            END,
            ' ',
            DATE_FORMAT(hour, '%H:%i')
        ) AS display_text
    FROM schedule_settings
    WHERE room = p_room 
      AND is_active = TRUE
      AND (
          (day_of_week = v_current_day AND hour > v_current_time)
          OR (day_of_week > v_current_day)
          OR (day_of_week < v_current_day)
      )
    ORDER BY days_until ASC, hour ASC
    LIMIT p_limit;
END //

DELIMITER ;

-- =====================================================
-- VERIFICACIÓN DE MIGRACIÓN
-- =====================================================

SELECT '✅ Tabla schedule_settings creada' AS status;
SELECT COUNT(*) AS total_horarios FROM schedule_settings;
SELECT room, COUNT(*) AS sorteos_semanales 
FROM schedule_settings 
GROUP BY room;

SELECT '✅ Procedure get_next_draws creado' AS status;
