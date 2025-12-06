-- Actualizar tabla daily_stock_cards para que coincida con el schema esperado
USE bingo_24k;

-- Agregar columna status si no existe
ALTER TABLE daily_stock_cards ADD COLUMN status ENUM('available', 'sold', 'discarded', 'expired') DEFAULT 'available';

-- Agregar columna room como alias de room_type
ALTER TABLE daily_stock_cards ADD COLUMN room VARCHAR(50);
UPDATE daily_stock_cards SET room = room_type WHERE room IS NULL;

-- Crear índices necesarios
CREATE INDEX idx_available_cards ON daily_stock_cards(room, play_date, status);
CREATE INDEX idx_daily_stock_buyer ON daily_stock_cards(buyer_id, play_date);

SELECT 'Tabla daily_stock_cards actualizada correctamente' AS resultado;
