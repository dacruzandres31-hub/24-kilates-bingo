-- Cargar $1,000,000 al usuario admin
-- Reemplaza 'admin' con tu nombre de usuario si es diferente

UPDATE users 
SET balance = balance + 1000000 
WHERE username = 'admin';

-- Verificar el balance actualizado
SELECT id, username, role, balance 
FROM users 
WHERE username = 'admin';
