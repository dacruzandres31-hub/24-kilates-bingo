-- ============================================
-- MIGRACIÓN: Flexibilidad en game_winners
-- ============================================

USE bingo_24k;

-- 1. Eliminar restricciones restrictivas en game_winners
-- No usamos IF EXISTS para ser compatibles con versiones viejas, 
-- el script de node ignorará los errores de "Key/Column not found" si lo deseamos 
-- o simplemente fallará y lo veremos.
ALTER TABLE game_winners DROP FOREIGN KEY game_winners_ibfk_3;
ALTER TABLE game_winners DROP INDEX uk_user_card_prize;

-- Cambiamos card_id a VARCHAR para soportar IDs de Starter (strings)
ALTER TABLE game_winners MODIFY COLUMN card_id VARCHAR(100) NOT NULL;

-- 2. Asegurar columnas de auditoría y notificaciones
ALTER TABLE game_winners ADD COLUMN card_data JSON NULL AFTER card_id;
ALTER TABLE game_winners ADD COLUMN ball_number INT NULL AFTER prize_type;
ALTER TABLE game_winners ADD COLUMN balls_drawn JSON NULL AFTER ball_number;
ALTER TABLE game_winners ADD COLUMN share_count INT DEFAULT 1 AFTER prize_amount;
ALTER TABLE game_winners ADD COLUMN notified BOOLEAN DEFAULT FALSE;
ALTER TABLE game_winners ADD COLUMN balance_credited BOOLEAN DEFAULT FALSE;
ALTER TABLE game_winners ADD COLUMN notified_at TIMESTAMP NULL;

-- Asegurar VARCHAR para prize_type
ALTER TABLE game_winners MODIFY COLUMN prize_type VARCHAR(50) NOT NULL;

SELECT '✅ Flexibilidad de game_winners aplicada' AS status;






