-- Actualizar configuración de beneficios de membresías
-- Ejecutar en producción

-- Embajador: 1 cartón bronce diario (ya configurado) + comisiones por referidos
-- Ya está bien configurado

-- Bronce: 1 cartón oro diario + bonus compra 10->9
UPDATE memberships SET benefits_config = '{
  "chat_badge": "bronze_animated",
  "free_cards_room": "gold",
  "daily_oro_cards": 1,
  "bonus_buy_threshold": 10,
  "bonus_buy_reward": 1,
  "wheel_extra_spin": "renewal"
}' WHERE name = 'Socio Bronce';

-- Plata: 2 cartones oro diarios + bonus 20->18 + 1 rueda diaria
UPDATE memberships SET benefits_config = '{
  "chat_badge": "silver_animated",
  "free_cards_room": "gold",
  "daily_oro_cards": 2,
  "bonus_buy_threshold": 20,
  "bonus_buy_reward": 2,
  "wheel_daily_spins": 1
}' WHERE name = 'Socio Plata';

-- Oro: 3 cartones oro diarios + bonus 20->16 + 2 ruedas diarias
UPDATE memberships SET benefits_config = '{
  "chat_badge": "gold_animated",
  "free_cards_room": "gold",
  "daily_oro_cards": 3,
  "bonus_buy_threshold": 20,
  "bonus_buy_reward": 4,
  "wheel_daily_spins": 2
}' WHERE name = 'Socio Oro';

-- Verificar
SELECT id, name, price, benefits_config FROM memberships ORDER BY price;
