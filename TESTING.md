# 🎮 TESTING - Guía Completa de Prueba

Cómo probar el sistema completo de Bingo 24K desde cero hasta ganar un premio.

## 📌 Pre-requisitos

- Sistema ejecutándose: `npm run dev`
- Todos los componentes inician correctamente
- PostgreSQL conectado y accesible

## 🧪 Test Escenario Completo

### FASE 1: Setup de Usuarios (5 min)

#### 1.1 Crear SuperAdmin (si no existe)

En PostgreSQL:
```sql
-- Conectar a database
psql -U postgres -d bingo_24k

-- Crear super admin con contraseña hasheada (ejemplo simplificado)
INSERT INTO users (username, password_hash, role, balance, can_process_payouts)
VALUES (
  'superadmin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/nP6', -- hash de "123456"
  'superadmin',
  50000.00,
  true
);

-- Verify
SELECT * FROM users WHERE username = 'superadmin';
```

#### 1.2 Crear Agente (via API)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "agente_test",
    "password": "agente123",
    "role": "agente",
    "parent_id": 1
  }'
```

Guardar el `token` retornado en variable:
```bash
AGENTE_TOKEN="token_aqui"
```

#### 1.3 Crear Jugador (via Admin o API)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jugador_test",
    "password": "jugador123",
    "role": "jugador",
    "parent_id": 2
  }'
```

Guardar token:
```bash
JUGADOR_TOKEN="token_aqui"
```

#### 1.4 Dar Balance al Jugador (Admin)

```bash
curl -X POST http://localhost:3000/api/finance/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -d '{
    "userId": 3,
    "amount": 1000
  }'
```

Verificar balance:
```bash
curl http://localhost:3000/api/finance/balance \
  -H "Authorization: Bearer JUGADOR_TOKEN"
```

✅ **Resultado esperado:** `{"balance": 1000}`

---

### FASE 2: Generar Stock (2 min)

En PostgreSQL:

```sql
-- Generar sesión para hoy
INSERT INTO game_sessions (room, start_time, status, is_preventa)
VALUES ('bronce', NOW() + INTERVAL '2 hours', 'pending', false);

-- Obtener el ID de la sesión creada
SELECT id FROM game_sessions ORDER BY created_at DESC LIMIT 1;
```

Nota: El `dailyGenerator` genera automáticamente 10k cartones vía scheduler, pero podemos insertar algunos manualmente para testing:

```sql
-- Insertar 5 cartones de ejemplo
INSERT INTO daily_stock_cards (room, serial_number, grid_numbers, play_date, play_time, status, price)
VALUES 
  ('bronce', 1, '[[1,2,3,4,5],[6,7,8,9,10],[11,12,NULL,14,15],[16,17,18,19,20],[21,22,23,24,25]]', CURRENT_DATE, '20:00:00', 'available', 50.00),
  ('bronce', 2, '[[2,3,4,5,6],[7,8,9,10,11],[12,13,NULL,15,16],[17,18,19,20,21],[22,23,24,25,26]]', CURRENT_DATE, '20:00:00', 'available', 50.00),
  ('bronce', 3, '[[3,4,5,6,7],[8,9,10,11,12],[13,14,NULL,16,17],[18,19,20,21,22],[23,24,25,26,27]]', CURRENT_DATE, '20:00:00', 'available', 50.00);
```

---

### FASE 3: Comprar Cartón (2 min)

```bash
# 1. Ver cartones disponibles
curl http://localhost:3000/api/game/sessions \
  -H "Authorization: Bearer JUGADOR_TOKEN"

# 2. Obtener el ID de la sesión (guardarlo como SESSION_ID)

# 3. Comprar cartón
curl -X POST http://localhost:3000/api/game/buy-card \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JUGADOR_TOKEN" \
  -d '{
    "cardId": 1,
    "roomType": "bronce",
    "playDate": "'$(date +'%Y-%m-%d')'",
    "sessionId": SESSION_ID
  }'
```

✅ **Resultado esperado:**
```json
{
  "success": true,
  "message": "Cartón comprado exitosamente",
  "card": {
    "id": 1,
    "price": 50
  }
}
```

Verificar balance descontado:
```bash
curl http://localhost:3000/api/finance/balance \
  -H "Authorization: Bearer JUGADOR_TOKEN"
# Debe ser 950 (1000 - 50)
```

---

### FASE 4: Jugar (Test Offline)

#### 4.1 Ver mis cartones

```bash
curl http://localhost:3000/api/game/my-cards \
  -H "Authorization: Bearer JUGADOR_TOKEN"
```

#### 4.2 Simular Sorteo

En JavaScript/Node:

```javascript
// Simular 5 números sorteados
const drawnNumbers = [1, 6, 11, 16, 21];

// Verificar si los números están en el cartón
const card = [[1,2,3,4,5],[6,7,8,9,10],[11,12,null,14,15],[16,17,18,19,20],[21,22,23,24,25]];

const marked = card.flat().filter(n => drawnNumbers.includes(n)).length;
console.log(`Números marcados: ${marked}/25`);
```

---

### FASE 5: Simular Fin de Partida (5 min)

```bash
# Terminar sesión y detectar ganador
curl -X POST http://localhost:3000/api/game/finish-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -d '{
    "sessionId": SESSION_ID
  }'
```

Si el gameEngine detecta BINGO:

```json
{
  "success": true,
  "gameResult": {
    "sessionId": 1,
    "drawnNumbers": [1, 2, 3, ...],
    "winners": [{
      "userId": 3,
      "amount": 250.00,
      "type": "bingo",
      "boleaNumber": 42
    }],
    "jackpotTriggered": false
  }
}
```

---

### FASE 6: Reclamar Premio (3 min)

#### 6.1 Ver premio

```bash
curl http://localhost:3000/api/finance/withdrawals \
  -H "Authorization: Bearer JUGADOR_TOKEN"
```

#### 6.2 Reclamar

```bash
curl -X POST http://localhost:3000/api/finance/withdrawal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JUGADOR_TOKEN" \
  -d '{
    "amount": 250,
    "cbu_alias": "alias@banco",
    "whatsapp": "+54 9 11 2345-6789"
  }'
```

✅ **Resultado esperado:**
```json
{
  "success": true,
  "claimId": 1,
  "amount": 250,
  "status": "pending"
}
```

Verificar balance:
```bash
curl http://localhost:3000/api/finance/balance \
  -H "Authorization: Bearer JUGADOR_TOKEN"
# Debe ser 700 (950 - 250 retirado + 250 ganado = 950)
```

---

## 🧪 Test Casos Especiales

### Test 1: Validación 20-Minuto (Withdrawal Lock)

```bash
# Crear nuevo jugador
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_20min",
    "password": "test123",
    "role": "jugador"
  }'

# Dar balance
curl -X POST http://localhost:3000/api/finance/deposit \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"userId": 4, "amount": 500}'

# Intentar retiro inmediatamente
curl -X POST http://localhost:3000/api/finance/withdrawal \
  -H "Authorization: Bearer TEST_20MIN_TOKEN" \
  -d '{"amount": 100, "cbu_alias": "test@banco", "whatsapp": "+54 9"}'

# Esperado: Error 403 "Must wait 20 minutes after deposit"

# Esperar 20 minutos...
# Luego retry → Debería funcionar
```

### Test 2: Duplicado de Usuario (409)

```bash
# Intentar crear usuario con mismo username
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "agente_test",
    "password": "otro123",
    "role": "jugador"
  }'

# Esperado: Error 409 "Usuario ya existe"
```

### Test 3: Balance Insuficiente

```bash
# Jugador con $10 intenta comprar cartón de $50
curl -X POST http://localhost:3000/api/game/buy-card \
  -H "Authorization: Bearer JUGADOR_TOKEN" \
  -d '{"cardId": 1, "roomType": "bronce", ...}'

# Esperado: Error 400 "Balance insuficiente"
```

### Test 4: Cascada de Jackpot

```sql
-- Ver si BINGO ocurrió después de bolilla 40
SELECT * FROM game_sessions 
WHERE status = 'completed' 
AND current_pot_jackpot > 0
AND jackpot_source_id IS NOT NULL;

-- Debe haber creado nueva sesión con jackpot transferido
```

### Test 5: Stock Limpieza (T-5)

En PostgreSQL:
```sql
-- Insertar cartones viejos (>24h)
INSERT INTO daily_stock_cards (..., play_date, status)
VALUES (..., CURRENT_DATE - INTERVAL '2 days', 'available');

-- Ejecutar cleanup manualmente (normalmente cron lo hace)
-- O esperar a que scheduler ejecute en T-5
```

---

## 📊 Métricas de Validación

Después de los tests, verificar:

### 1. Database Integridad
```sql
-- Users creados correctamente
SELECT COUNT(*) FROM users;

-- Cartones con estructura válida
SELECT COUNT(*) FROM daily_stock_cards WHERE status = 'available';

-- Auditoría completa
SELECT COUNT(*) FROM audit_revenue;
```

### 2. API Health
```bash
curl http://localhost:3000/health
```

Debe retornar:
- ✅ status: "ok"
- ✅ scheduler: running true
- ✅ activeJobs: 3+

### 3. Socket.IO Conectado
En browser console (Player o Admin):
```javascript
console.log(socket.connected); // Debe ser true
```

### 4. Logs del Servidor
Buscar en terminal:
```
[Scheduler] Job iniciado
[Socket.IO] Cliente conectado
[GameEngine] Números sorteados
[CascadeLogic] Jackpot transferido
```

---

## 🎯 Checklist de Test

- [ ] SuperAdmin creado
- [ ] Agente creado
- [ ] Jugador creado
- [ ] Balance distribuido
- [ ] Sesión creada
- [ ] Cartones generados
- [ ] Cartón comprado (balance descontado)
- [ ] Números sorteados
- [ ] Ganador detectado
- [ ] Premio reclamado (balance actualizado)
- [ ] Retiro procesado
- [ ] Auditoría registrada
- [ ] 20-min rule validada
- [ ] Duplicados rechazados
- [ ] Cascada de jackpot funciona
- [ ] Health check OK
- [ ] Socket.IO conectado
- [ ] Scheduler activo

---

## 🐛 Si Algo Falla

1. **Revisar logs del servidor** - `npm run dev` muestra todo
2. **Verificar BD** - `psql -d bingo_24k -c "SELECT * FROM users"`
3. **Validar tokens** - Decodificar JWT en jwt.io
4. **Check endpoints** - Usar Postman o curl
5. **Reiniciar servicios** - Matar procesos y reiniciar

---

## 🎉 Test Exitoso = Sistema Listo para MVP

Si todos los tests pasan:
- ✅ Backend funcional
- ✅ Frontend responsivo
- ✅ Database consistente
- ✅ Scheduler automático
- ✅ Security validado
- ✅ Listo para producción (con SSL/Nginx)

---

**Total de tiempo esperado:** 20-30 minutos para test completo

¡Happy Testing! 🚀
