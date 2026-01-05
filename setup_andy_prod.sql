-- Configurar Andy como SuperAdmin principal
UPDATE users SET 
    username = 'Andy', 
    balance = 1000000.00, 
    can_process_payouts = 1
WHERE id = 1;

-- Verificar
SELECT id, username, role, balance, can_process_payouts FROM users WHERE id = 1;
