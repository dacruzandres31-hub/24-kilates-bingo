ALTER TABLE room_settings 
ADD COLUMN agent_bonus_percentage DECIMAL(5,2) DEFAULT 10.00 AFTER card_price;
