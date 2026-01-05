-- Agregar 'replaced' al ENUM de status para permitir reemplazo de membresías por upgrade
ALTER TABLE user_subscriptions MODIFY COLUMN status ENUM('active','cancelled','expired','replaced') DEFAULT 'active';
