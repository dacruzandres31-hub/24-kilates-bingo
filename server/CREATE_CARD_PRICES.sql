CREATE TABLE IF NOT EXISTS card_prices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room ENUM('bronce','plata','oro','free_starter') NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT
);

INSERT INTO card_prices (room, price, is_active) VALUES
('bronce', 500, 1),
('plata', 1000, 1),
('oro', 2000, 1),
('free_starter', 0, 1)
ON DUPLICATE KEY UPDATE price=VALUES(price);

SELECT * FROM card_prices;
