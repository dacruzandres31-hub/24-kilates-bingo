-- Script para crear usuario SuperAdmin
-- INSTRUCCIONES:
-- 1. Reemplaza 'tu_usuario' con tu username deseado
-- 2. Reemplaza 'tu_password' con tu password deseada
-- 3. Ejecuta este script en MySQL

-- El password 'admin123' ya está hasheado con bcrypt (10 rounds)
-- Hash: $2a$10$vI8aWBnW3fID.ZQ4/zo1G.UDWnJ7rqlcwQNrWKGRpHJl9hYEqNJzC

-- EJEMPLOS DE USUARIOS PREDEFINIDOS:

-- Usuario 1: admin / admin123
INSERT INTO users (username, password_hash, role, balance, can_process_payouts) 
VALUES ('admin', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.UDWnJ7rqlcwQNrWKGRpHJl9hYEqNJzC', 'superadmin', 1000000.00, TRUE)
ON DUPLICATE KEY UPDATE 
  password_hash = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.UDWnJ7rqlcwQNrWKGRpHJl9hYEqNJzC',
  role = 'superadmin',
  can_process_payouts = TRUE;

-- Usuario 2: superadmin / superadmin123
INSERT INTO users (username, password_hash, role, balance, can_process_payouts) 
VALUES ('superadmin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'superadmin', 5000000.00, TRUE)
ON DUPLICATE KEY UPDATE 
  password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  role = 'superadmin',
  can_process_payouts = TRUE;

-- CREAR TU PROPIO USUARIO:
-- Si quieres un password diferente, necesitas hashear tu password con bcrypt
-- Puedes usar el siguiente script Node.js:

-- Verificar usuarios superadmin creados
SELECT id, username, role, balance, can_process_payouts, created_at 
FROM users 
WHERE role = 'superadmin';
