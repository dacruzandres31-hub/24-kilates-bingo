-- Crear usuario mock para testing
INSERT INTO users (id, username, email, password_hash, role, balance, parent_id, can_process_payouts, can_create_agentes, can_adjust_balances, active) 
VALUES (999, 'testing_user', 'testing@test.com', '$2b$10$dummyhash123456789012345678', 'jugador', 0, NULL, 0, 0, 0, 1) 
ON DUPLICATE KEY UPDATE username='testing_user', active=1;
