-- Migration: Add ticket_room columns to starter_room_config
-- Date: 2026-01-03

-- Add ticket_room_linea column
ALTER TABLE starter_room_config 
ADD COLUMN ticket_room_linea ENUM('bronce','plata','oro') DEFAULT 'bronce' AFTER prizes_linea;

-- Add ticket_room_bingo column
ALTER TABLE starter_room_config 
ADD COLUMN ticket_room_bingo ENUM('bronce','plata','oro') DEFAULT 'oro' AFTER prizes_bingo;

-- Update existing rows with default values
UPDATE starter_room_config SET ticket_room_linea = 'bronce', ticket_room_bingo = 'oro' WHERE id > 0;

-- Verify columns added
DESCRIBE starter_room_config;
