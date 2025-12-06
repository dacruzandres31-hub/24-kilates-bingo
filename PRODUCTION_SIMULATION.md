# 🔐 MODO PRODUCCIÓN - Configuración Avanzada

Guía para configurar Bingo 24K en un entorno más cercano a producción.

---

## 🎯 Fase 1: Setup Básico Completado

✅ Backend API en puerto 3000  
✅ Player PWA en puerto 5173  
✅ Admin Panel en puerto 5174  
✅ PostgreSQL corriendo  
✅ Scheduler activo  

---

## 📋 Fase 2: Configuración Simulada de Producción

### 2.1 Crear Usuarios Base en Database

```sql
-- Conectar a database
psql -U postgres -d bingo_24k

-- SUPERADMIN
INSERT INTO users (username, password_hash, role, balance, can_process_payouts)
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/nP6', -- hash de "123456"
  'superadmin',
  100000.00,
  true
);

-- AGENTE 1
INSERT INTO users (username, password_hash, role, parent_id, balance, can_process_payouts)
VALUES (
  'agente1',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/nP6', -- "123456"
  'agente',
  1, -- parent = admin
  25000.00,
  false
);

-- AGENTE 2
INSERT INTO users (username, password_hash, role, parent_id, balance, can_process_payouts)
VALUES (
  'agente2',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/nP6',
  'agente',
  1,
  25000.00,
  false
);

-- JUGADORES (varios)
INSERT INTO users (username, password_hash, role, parent_id, balance, last_deposit_at)
VALUES
  ('jugador1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/nP6', 'jugador', 2, 500.00, NOW()),
  ('jugador2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/nP6', 'jugador', 2, 300.00, NOW()),
  ('jugador3', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/nP6', 'jugador', 3, 750.00, NOW()),
  ('jugador4', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/nP6', 'jugador', 3, 450.00, NOW());

-- Verificar usuarios creados
SELECT id, username, role, balance FROM users ORDER BY id;
```

### 2.2 Generar Stock Inicial

```sql
-- Crear sesiones para diferentes salas (hoy + siguientes días)
INSERT INTO game_sessions (room, start_time, status, is_preventa)
VALUES 
  ('bronce', NOW() + INTERVAL '8 hours', 'pending', false),
  ('bronce', NOW() + INTERVAL '32 hours', 'pending', false),
  ('plata', NOW() + INTERVAL '8 hours', 'pending', false),
  ('plata', NOW() + INTERVAL '32 hours', 'pending', false),
  ('oro', NOW() + INTERVAL '8 hours', 'pending', false);

-- Verificar sesiones
SELECT id, room, status, start_time FROM game_sessions ORDER BY start_time;
```

### 2.3 Generar Cartones (Stock)

En PostgreSQL, insertar algunos cartones de ejemplo:

```sql
-- Para BRONCE
INSERT INTO daily_stock_cards (room, serial_number, grid_numbers, play_date, play_time, status, price)
VALUES 
  ('bronce', 1, '[[1,2,3,4,5],[6,7,8,9,10],[11,12,null,14,15],[16,17,18,19,20],[21,22,23,24,25]]', CURRENT_DATE, '20:00:00', 'available', 50.00),
  ('bronce', 2, '[[2,3,4,5,6],[7,8,9,10,11],[12,13,null,15,16],[17,18,19,20,21],[22,23,24,25,26]]', CURRENT_DATE, '20:00:00', 'available', 50.00),
  ('bronce', 3, '[[3,4,5,6,7],[8,9,10,11,12],[13,14,null,16,17],[18,19,20,21,22],[23,24,25,26,27]]', CURRENT_DATE, '20:00:00', 'available', 50.00);

-- Para PLATA (precio $100)
INSERT INTO daily_stock_cards (room, serial_number, grid_numbers, play_date, play_time, status, price)
VALUES 
  ('plata', 1, '[[1,16,31,46,61],[2,17,32,47,62],[3,18,null,48,63],[4,19,34,49,64],[5,20,35,50,65]]', CURRENT_DATE, '20:00:00', 'available', 100.00),
  ('plata', 2, '[[6,21,36,51,66],[7,22,37,52,67],[8,23,null,53,68],[9,24,39,54,69],[10,25,40,55,70]]', CURRENT_DATE, '20:00:00', 'available', 100.00);

-- Para ORO (precio $250)
INSERT INTO daily_stock_cards (room, serial_number, grid_numbers, play_date, play_time, status, price)
VALUES 
  ('oro', 1, '[[1,16,31,46,61],[2,17,32,47,62],[3,18,null,48,63],[4,19,34,49,64],[5,20,35,50,65]]', CURRENT_DATE, '20:00:00', 'available', 250.00),
  ('oro', 2, '[[11,26,41,56,71],[12,27,42,57,72],[13,28,null,58,73],[14,29,44,59,74],[15,30,45,60,75]]', CURRENT_DATE, '20:00:00', 'available', 250.00);

-- Verificar cartones
SELECT COUNT(*) as total_cards FROM daily_stock_cards;
SELECT room, COUNT(*) as count FROM daily_stock_cards GROUP BY room;
```

---

## 🎮 Fase 3: Simular Flujo Completo de Juego

### 3.1 Login como Jugador

```bash
# Terminal 1 - Abrir navegador
http://localhost:5173

# O usar curl:
PLAYER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "jugador1", "password": "123456"}' | jq -r '.token')

echo $PLAYER_TOKEN
```

### 3.2 Ver Balance

```bash
curl http://localhost:3000/api/finance/balance \
  -H "Authorization: Bearer $PLAYER_TOKEN"
```

### 3.3 Comprar Cartón

```bash
# 1. Obtener cartón disponible ID
CARD_ID=1
ROOM=bronce

# 2. Comprar
curl -X POST http://localhost:3000/api/game/buy-card \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLAYER_TOKEN" \
  -d '{
    "cardId": '$CARD_ID',
    "roomType": "'$ROOM'",
    "playDate": "'$(date +'%Y-%m-%d')'",
    "sessionId": 1
  }'

# 3. Verificar balance actualizado
curl http://localhost:3000/api/finance/balance \
  -H "Authorization: Bearer $PLAYER_TOKEN"
```

### 3.4 Ver Cartones Comprados

```bash
curl http://localhost:3000/api/game/my-cards \
  -H "Authorization: Bearer $PLAYER_TOKEN" | jq
```

---

## 👨‍💼 Fase 4: Admin Panel Operations

### 4.1 Login Admin

```bash
http://localhost:5174
# User: admin
# Pass: 123456
```

### 4.2 Crear Nuevo Jugador (Admin)

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "123456"}' | jq -r '.token')

# Crear jugador
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "nuevo_jugador",
    "password": "pass123",
    "newRole": "jugador",
    "parent_id": 2
  }'
```

### 4.3 Dar Balance a Jugador

```bash
curl -X POST http://localhost:3000/api/finance/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "userId": 5,
    "amount": 500
  }'
```

### 4.4 Ver Red de Usuarios

```bash
curl http://localhost:3000/api/users/2/network \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

---

## 🎲 Fase 5: Simular Partida Completa

### 5.1 Iniciar Game Session

```sql
-- En PostgreSQL, crear sesión activa
UPDATE game_sessions 
SET status = 'active' 
WHERE id = 1;
```

### 5.2 Simular Sorteo de Números

En Node.js (o terminal):

```javascript
// Simular 25 números para LÍNEA + 25 para BINGO
const lineNumbers = [1, 6, 11, 16, 21]; // Primera línea horizontal
const bingoNumbers = [...lineNumbers, 2, 7, 12, 17, 22, 3, 8, 13, 18, 23, 4, 9, 14, 19, 24, 5, 10, 15, 20, 25];

console.log("LÍNEA en bolilla 5");
console.log("BINGO en bolilla 25");
```

### 5.3 Detectar Ganador

En backend (simular):

```bash
# Terminar sesión (trigger game engine)
curl -X POST http://localhost:3000/api/game/finish-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"sessionId": 1}'
```

### 5.4 Ver Premio Reclamado

```bash
# Como jugador, ver retiros disponibles
curl http://localhost:3000/api/finance/withdrawals \
  -H "Authorization: Bearer $PLAYER_TOKEN"
```

---

## 📊 Fase 6: Verificar Datos & Auditoría

### 6.1 Usuarios Creados

```sql
SELECT id, username, role, balance, parent_id 
FROM users 
ORDER BY id;
```

### 6.2 Sesiones

```sql
SELECT id, room, status, current_pot_bingo, current_pot_linea, current_pot_jackpot
FROM game_sessions
ORDER BY created_at DESC;
```

### 6.3 Cartones Vendidos

```sql
SELECT id, room, buyer_id, price, status
FROM daily_stock_cards
WHERE status = 'sold'
ORDER BY created_at DESC;
```

### 6.4 Auditoría (Money Trail)

```sql
SELECT player_id, amount, transaction_type, agent_path, created_at
FROM audit_revenue
ORDER BY created_at DESC
LIMIT 20;
```

### 6.5 Premios Reclamados

```sql
SELECT user_id, amount, status, cbu_alias, created_at
FROM prize_claims
ORDER BY created_at DESC;
```

---

## ⚙️ Fase 7: Pruebas de Estrés

### 7.1 Crear 100 Jugadores

```bash
for i in {1..100}; do
  curl -s -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "username": "stress_test_'$i'",
      "password": "test123",
      "role": "jugador"
    }' > /dev/null
  echo "Usuario $i creado"
done
```

### 7.2 Múltiples Compras Simultáneas

```bash
# Script para simular 10 compras en paralelo
for i in {1..10}; do
  (
    TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username": "jugador'$i'", "password": "123456"}' | jq -r '.token')
    
    curl -X POST http://localhost:3000/api/game/buy-card \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"cardId": '$i', "roomType": "bronce", "playDate": "2024-01-01", "sessionId": 1}'
    
    echo "Compra $i completada"
  ) &
done
wait
```

### 7.3 Verificar Database bajo carga

```bash
# Ver número de conexiones activas
psql -U postgres -d bingo_24k -c "SELECT count(*) FROM pg_stat_activity;"

# Ver queries activas
psql -U postgres -d bingo_24k -c "SELECT query, query_start FROM pg_stat_activity WHERE query != '<idle>';"
```

---

## 🔍 Fase 8: Monitoreo

### 8.1 Ver Logs en Vivo

Terminal donde está `npm run dev`:
- Buscar [Socket.IO], [Scheduler], [GameEngine]

### 8.2 Health Check Periódico

```bash
# Cada 5 segundos
while true; do
  curl -s http://localhost:3000/health | jq '.'
  sleep 5
done
```

### 8.3 Monitorear PostgreSQL

```bash
# Ver tamaño de tablas
psql -U postgres -d bingo_24k -c "
  SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) as size
  FROM pg_catalog.pg_statio_user_tables
  ORDER BY pg_total_relation_size(relid) DESC;
"

# Ver crecimiento diario
psql -U postgres -d bingo_24k -c "
  SELECT DATE(created_at), COUNT(*) as records
  FROM audit_revenue
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
"
```

---

## 🚨 Simular Errores y Validaciones

### 9.1 Test 20-Minuto Rule

```bash
# Crear usuario nuevo
NEW_USER=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_20min",
    "password": "test123",
    "role": "jugador"
  }' | jq -r '.user.id')

# Dar balance (set last_deposit_at a NOW)
curl -X POST http://localhost:3000/api/finance/deposit \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"userId\": $NEW_USER, \"amount\": 500}"

# Intentar retiro INMEDIATAMENTE
curl -X POST http://localhost:3000/api/finance/withdrawal \
  -H "Authorization: Bearer $NEW_USER_TOKEN" \
  -d '{
    "amount": 100,
    "cbu_alias": "test@banco",
    "whatsapp": "+54 9"
  }'

# Esperado: Error 403 "Must wait 20 minutes after deposit"
```

### 9.2 Test Duplicado (409)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jugador1",
    "password": "otro_pass",
    "role": "jugador"
  }'

# Esperado: 409 "Usuario ya existe"
```

### 9.3 Test Balance Insuficiente

```bash
# Jugador con balance bajo intenta comprar cartón caro
curl -X POST http://localhost:3000/api/game/buy-card \
  -H "Authorization: Bearer $LOW_BALANCE_TOKEN" \
  -d '{
    "cardId": 1,
    "roomType": "oro",
    "playDate": "2024-01-01"
  }'

# Esperado: 400 "Balance insuficiente"
```

---

## 📊 KPIs para Monitorear

```
1. Usuarios Activos
   SELECT COUNT(DISTINCT id) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours';

2. Cartones Vendidos
   SELECT COUNT(*) FROM daily_stock_cards WHERE status = 'sold' AND DATE(created_at) = CURRENT_DATE;

3. Revenue del Día
   SELECT SUM(amount) FROM audit_revenue WHERE DATE(created_at) = CURRENT_DATE;

4. Promedio por Usuario
   SELECT AVG(amount) FROM daily_stock_cards WHERE status = 'sold' AND DATE(created_at) = CURRENT_DATE;

5. Tasa de Conversión
   SELECT 
     COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold,
     COUNT(*) as total,
     ROUND(100.0 * COUNT(CASE WHEN status = 'sold' THEN 1 END) / COUNT(*), 2) as conversion_rate
   FROM daily_stock_cards;
```

---

## 🎯 Checklist Modo Producción Simulado

- [ ] Usuarios base creados (admin, agentes, jugadores)
- [ ] Stock inicial generado
- [ ] Sesiones de juego activas
- [ ] Flujo completo probado (compra → juego → premio)
- [ ] Admin panel operativo
- [ ] Retiros procesados
- [ ] 20-min rule validada
- [ ] Duplicados rechazados
- [ ] Balance actualizado correctamente
- [ ] Auditoría registrada
- [ ] Health check OK
- [ ] Scheduler ejecutando
- [ ] Database creciendo correctamente
- [ ] KPIs siendo tracked

---

## 🚀 Próximo Paso

Cuando estés listo para PRODUCCIÓN REAL:

1. Crear certificado SSL (Let's Encrypt)
2. Configurar Nginx
3. Deploizar en servidor
4. Configurar backups automáticos
5. Agregar monitoring
6. Habilitar 2FA (Google Authenticator)
7. Rate limiting

**¡Pero primero, asegúrate de que TODO funciona localmente!**

---

**Estado:** Simulación de Producción Completada ✅  
**Siguiente:** Real Production Deployment

---

¡Éxito! 🚀
