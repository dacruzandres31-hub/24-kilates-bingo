-- Insertar las 4 membresías del Club VIP
INSERT INTO memberships (name, price, benefits_config) VALUES
('Socio Embajador 24K', 5000.00, '{"daily_bronze_cards": 1, "referral_commission_membership": {"l1": 0.04, "l2": 0.03, "l3": 0.02, "l4": 0.01}, "combinable": true}'),
('Socio Bronce', 5000.00, '{"monthly_free_cards": 10, "free_cards_room": "gold", "wheel_extra_spin": "renewal", "chat_badge": "bronze_animated"}'),
('Socio Plata', 10000.00, '{"monthly_free_cards": 20, "free_cards_room": "gold", "bonus_buy_threshold": 20, "bonus_buy_reward": 2, "bonus_buy_room": "same", "wheel_daily_spins": 1, "chat_badge": "silver_animated"}'),
('Socio Oro', 20000.00, '{"monthly_free_cards": 50, "free_cards_room": "gold", "bonus_buy_threshold": 20, "bonus_buy_reward": 4, "bonus_buy_room": "same", "wheel_daily_spins": 2, "chat_badge": "gold_animated"}');
