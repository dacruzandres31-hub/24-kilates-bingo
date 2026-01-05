UPDATE room_settings SET card_price = 500 WHERE room = 'bronce';
UPDATE room_settings SET card_price = 1000 WHERE room = 'plata';
UPDATE room_settings SET card_price = 2000 WHERE room = 'oro';
SELECT room, card_price FROM room_settings;
