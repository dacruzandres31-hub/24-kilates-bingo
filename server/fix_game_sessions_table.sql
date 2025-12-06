-- Actualizar tabla game_sessions para que coincida con el schema PostgreSQL
-- Ejecutar este script en MySQL

USE bingo_24k;

-- Agregar columnas faltantes (una por una para evitar errores si ya existen)
ALTER TABLE game_sessions ADD COLUMN start_time TIMESTAMP NULL;
ALTER TABLE game_sessions ADD COLUMN current_pot_bingo DECIMAL(15, 2) DEFAULT 0.00;
ALTER TABLE game_sessions ADD COLUMN current_pot_linea DECIMAL(15, 2) DEFAULT 0.00;
ALTER TABLE game_sessions ADD COLUMN current_pot_jackpot DECIMAL(15, 2) DEFAULT 0.00;
ALTER TABLE game_sessions ADD COLUMN jackpot_source_id INT NULL;
ALTER TABLE game_sessions ADD COLUMN is_preventa BOOLEAN DEFAULT FALSE;
ALTER TABLE game_sessions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Modificar columna status para incluir todos los estados necesarios
ALTER TABLE game_sessions
MODIFY COLUMN status ENUM('pending', 'active', 'completed', 'waiting', 'finished') DEFAULT 'pending';

-- Agregar índices para mejor performance
CREATE INDEX idx_game_sessions_room ON game_sessions(room);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_game_sessions_start_time ON game_sessions(start_time);

SELECT 'Tabla game_sessions actualizada correctamente' AS resultado;
