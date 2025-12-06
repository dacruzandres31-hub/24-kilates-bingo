# 🎯 SISTEMA DE RETIROS CON REGLA DE 20 MINUTOS

## 📋 Resumen del Sistema

El sistema implementa un flujo completo de retiros con verificación de datos bancarios (CBU) y una **regla de 20 minutos** que controla quién puede procesar retiros según el tiempo transcurrido desde la última acreditación de fichas.

---

## 🔄 Flujo Completo

### 1️⃣ **Acreditación de Fichas (Automática)**
Cuando un jugador gana línea o bingo:
```javascript
// gameEngine.js - Al detectar ganador
await ChipsService.recordGameMovement(
  userId,
  prizeAmount,
  sessionId,
  'win',  // Tipo de movimiento
  'Premio BINGO - Sesión 123 - Bolea 45'
);
```
- Las fichas se acreditan **automáticamente** al balance del jugador
- Se registra en `chips_movements` con timestamp
- El balance se actualiza instantáneamente

### 2️⃣ **Solicitud de Retiro (Por el Jugador)**
El jugador llena sus datos bancarios y solicita el retiro:

**Endpoint:** `POST /api/withdrawals/request`

**Body:**
```json
{
  "amount": 5000,
  "bankAccountHolder": "Juan Pérez",
  "cbu": "0170099520000012345678",
  "bankName": "Banco Nación",
  "accountType": "savings"
}
```

**Validaciones:**
- Balance suficiente
- CBU válido (22 dígitos)
- Monto mínimo: 100 fichas
- Estado: `pending`

### 3️⃣ **Procesamiento por Cajero/SuperAdmin**

**Regla de 20 Minutos:**
- ⏱️ **< 20 minutos** desde última acreditación → **Cajero o SuperAdmin** pueden procesar
- ⏱️ **≥ 20 minutos** desde última acreditación → **Solo SuperAdmin** puede procesar

**Endpoint:** `POST /api/withdrawals/:id/process`

**Headers:**
```
Authorization: Bearer <token_con_rol>
```

**Body:**
```json
{
  "transferReceipt": "https://url-del-comprobante.com/receipt.pdf"
}
```

**Proceso:**
1. Valida permisos según rol y tiempo
2. Debita fichas del balance del jugador
3. Registra movimiento en `chips_movements` (tipo `withdrawal`)
4. Actualiza estado de solicitud a `completed`
5. Guarda referencia al comprobante de transferencia

---

## 🗄️ Estructura de Base de Datos

### Tabla: `withdrawal_requests`
```sql
CREATE TABLE withdrawal_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  
  -- Datos bancarios
  bank_account_holder VARCHAR(255) NOT NULL,
  cbu VARCHAR(22) NOT NULL,
  bank_name VARCHAR(255),
  account_type ENUM('savings', 'checking', 'other'),
  
  -- Estado
  status ENUM('pending', 'processing', 'completed', 'rejected', 'cancelled'),
  
  -- Timestamps
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  
  -- Procesamiento
  processed_by INT,  -- ID del admin/cajero
  processor_role ENUM('cajero', 'superadmin'),
  chips_movement_id INT,  -- FK a chips_movements
  
  -- Metadata
  rejection_reason VARCHAR(500),
  transfer_receipt VARCHAR(255),
  metadata JSON
);
```

### Tabla: `chips_movements` (Ya existente)
```sql
-- Registra TODOS los movimientos de fichas
CREATE TABLE chips_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  movement_type ENUM('deposit', 'withdrawal', 'bet', 'win', 'refund', 
                     'transfer_in', 'transfer_out', 'adjustment', 'bonus', 'penalty'),
  amount DECIMAL(15, 2) NOT NULL,  -- Puede ser negativo
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  admin_id INT,
  game_session_id INT,
  reason VARCHAR(500) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `users`
```sql
-- Se agregó columna 'role'
ALTER TABLE users ADD COLUMN role ENUM('player', 'cajero', 'admin', 'superadmin') 
  DEFAULT 'player';
```

---

## 🔐 Roles y Permisos

### **Player (Jugador)**
- ✅ Crear solicitudes de retiro
- ✅ Ver sus propias solicitudes
- ✅ Ver su historial de retiros
- ❌ Procesar retiros

### **Cajero (Cajero/Operador)**
- ✅ Ver todas las solicitudes pendientes
- ✅ Procesar retiros **< 20 minutos** desde acreditación
- ❌ Procesar retiros **≥ 20 minutos** (requiere superadmin)
- ✅ Ver historial completo

### **Admin**
- ✅ Todas las funciones de cajero
- ✅ Rechazar solicitudes
- ❌ Procesar retiros **≥ 20 minutos** (requiere superadmin)

### **SuperAdmin**
- ✅ **Procesar CUALQUIER retiro** sin restricción de tiempo
- ✅ Todas las funciones anteriores
- ✅ Control total del sistema

---

## 🛠️ Funciones SQL Implementadas

### `can_process_withdrawal_time_rule()`
Valida si un rol puede procesar un retiro según el tiempo:
```sql
-- Uso interno
SELECT can_process_withdrawal_time_rule(user_id, amount, 'cajero') as can_process;
-- Retorna TRUE/FALSE
```

### `get_minutes_since_last_credit()`
Obtiene minutos desde la última acreditación de fichas:
```sql
SELECT get_minutes_since_last_credit(123) as minutes;
-- Retorna: 15 (minutos)
```

### Procedimiento: `process_withdrawal_complete()`
Procesa un retiro completo con todas las validaciones:
```sql
CALL process_withdrawal_complete(
  withdrawal_id,
  processor_id,
  'cajero',
  'https://receipt.com/proof.pdf'
);
```

---

## 📡 Endpoints API

### **Jugador**

#### Crear solicitud de retiro
```http
POST /api/withdrawals/request
Authorization: Bearer <player_token>
Content-Type: application/json

{
  "amount": 5000,
  "bankAccountHolder": "Juan Pérez",
  "cbu": "0170099520000012345678",
  "bankName": "Banco Nación",
  "accountType": "savings"
}
```

#### Ver solicitudes pendientes propias
```http
GET /api/withdrawals/pending
Authorization: Bearer <player_token>
```

#### Ver historial de retiros
```http
GET /api/withdrawals/history?status=completed&limit=50
Authorization: Bearer <player_token>
```

---

### **Cajero/Admin**

#### Ver todas las solicitudes pendientes
```http
GET /api/withdrawals/pending?userId=123
Authorization: Bearer <cajero_token>
```

#### Verificar permisos antes de procesar
```http
GET /api/withdrawals/456/check-permissions
Authorization: Bearer <cajero_token>

Response:
{
  "success": true,
  "data": {
    "withdrawalRequestId": 456,
    "userId": 123,
    "amount": 5000,
    "minutesSinceCredit": 15,
    "processorRole": "cajero",
    "canProcess": true,
    "reason": "Tiene permisos para procesar este retiro"
  }
}
```

#### Procesar retiro
```http
POST /api/withdrawals/456/process
Authorization: Bearer <cajero_token>
Content-Type: application/json

{
  "transferReceipt": "https://comprobante.com/transfer123.pdf"
}
```

**Si pasan más de 20 minutos:**
```json
{
  "success": false,
  "message": "No tiene permisos para procesar este retiro. Han pasado 25 minutos desde la última acreditación. Solo un superadmin puede procesar retiros después de 20 minutos."
}
```

#### Rechazar solicitud
```http
POST /api/withdrawals/456/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "rejectionReason": "CBU no válido, verificar datos bancarios"
}
```

---

## 🎬 Ejemplo de Flujo Completo

### **Escenario 1: Retiro Inmediato (< 20 minutos)**

1. **T=0min**: Jugador gana BINGO, se acreditan 10,000 fichas
```javascript
// gameEngine.js ejecuta automáticamente:
ChipsService.recordGameMovement(userId, 10000, sessionId, 'win', 'Premio BINGO');
// Balance: 10,000 fichas
```

2. **T=5min**: Jugador solicita retiro
```bash
curl -X POST http://localhost:3001/api/withdrawals/request \
  -H "Authorization: Bearer player_token" \
  -d '{"amount": 10000, "bankAccountHolder": "Juan Pérez", "cbu": "0170099520000012345678"}'
```

3. **T=10min**: Cajero procesa retiro (puede porque < 20min)
```bash
curl -X POST http://localhost:3001/api/withdrawals/1/process \
  -H "Authorization: Bearer cajero_token" \
  -d '{"transferReceipt": "https://receipt.pdf"}'
```

✅ **Resultado:** Retiro procesado, fichas debitadas, transferencia realizada

---

### **Escenario 2: Retiro Tardío (≥ 20 minutos)**

1. **T=0min**: Jugador gana LÍNEA, se acreditan 2,000 fichas
2. **T=25min**: Jugador solicita retiro
3. **T=30min**: Cajero intenta procesar

❌ **Error:** 
```json
{
  "success": false,
  "message": "No tiene permisos para procesar este retiro. Han pasado 30 minutos desde la última acreditación. Solo un superadmin puede procesar retiros después de 20 minutos."
}
```

4. **T=35min**: SuperAdmin procesa retiro

✅ **Resultado:** SuperAdmin procesa exitosamente (sin restricción de tiempo)

---

## 🔍 Vistas SQL para Reportes

### `v_pending_withdrawals`
Solicitudes pendientes con permisos calculados:
```sql
SELECT * FROM v_pending_withdrawals;

| id | user_id | amount | cbu | minutes_since_credit | processing_permission |
|----|---------|--------|-----|----------------------|----------------------|
| 1  | 123     | 5000   | ... | 15                   | cajero_can_process   |
| 2  | 456     | 8000   | ... | 45                   | superadmin_only      |
```

### `v_completed_withdrawals`
Historial de retiros completados:
```sql
SELECT * FROM v_completed_withdrawals;

| id | username | amount | cbu | processor_username | processing_time_minutes |
|----|----------|--------|-----|-------------------|------------------------|
| 1  | juan123  | 5000   | ... | cajero_01         | 12                     |
```

---

## 🚀 Instalación y Migración

### 1. Ejecutar migración de base de datos
```bash
cd server
mysql -u root -p bingo_24k < WITHDRAWAL_REQUESTS_MIGRATION.sql
```

### 2. Verificar funciones creadas
```sql
USE bingo_24k;
SHOW FUNCTION STATUS WHERE Db = 'bingo_24k';
-- Debe mostrar:
-- - can_process_withdrawal_time_rule
-- - get_minutes_since_last_credit
```

### 3. Asignar roles a usuarios
```sql
-- Crear superadmin
UPDATE users SET role = 'superadmin' WHERE id = 1;

-- Crear cajero
UPDATE users SET role = 'cajero' WHERE id = 2;

-- Verificar
SELECT id, username, role FROM users WHERE role != 'player';
```

### 4. Probar endpoints
```bash
# Verificar que el servidor esté corriendo
curl http://localhost:3001/health

# El servidor ya tiene las rutas integradas:
# - /api/withdrawals/* (nuevo)
# - /api/chips/* (existente)
```

---

## 📊 Auditoría y Trazabilidad

### Cada movimiento de fichas queda registrado:
```sql
-- Ver historial completo de un jugador
SELECT 
  cm.id,
  cm.movement_type,
  cm.amount,
  cm.balance_before,
  cm.balance_after,
  cm.reason,
  cm.created_at,
  u_admin.username as admin_username
FROM chips_movements cm
LEFT JOIN users u_admin ON cm.admin_id = u_admin.id
WHERE cm.user_id = 123
ORDER BY cm.created_at DESC;
```

### Auditoría de balance:
```javascript
// Endpoint: GET /api/chips/audit/:userId
// Verifica que balance_after = balance_before + amount en todos los movimientos
const audit = await ChipsService.auditUserBalance(123);

console.log(audit);
/*
{
  userId: 123,
  username: 'juan123',
  currentBalance: 10000,
  calculatedBalance: 10000,
  finalDiscrepancy: 0,
  isValid: true,
  discrepancies: [],
  totalMovements: 150
}
*/
```

---

## ✅ Checklist de Implementación

- [x] Migración SQL ejecutada
- [x] Tabla `withdrawal_requests` creada
- [x] Funciones SQL implementadas
- [x] Vistas SQL creadas
- [x] `chipsService.js` actualizado con métodos de retiro
- [x] `withdrawalController.js` creado
- [x] `withdrawalRoutes.js` creado
- [x] Middleware de roles (`authMiddleware.js`) actualizado
- [x] Rutas integradas en `index.js`
- [x] `gameEngine.js` acredita fichas automáticamente al ganar
- [ ] Asignar roles a usuarios en BD
- [ ] Probar flujo completo de retiro
- [ ] Crear interfaz de usuario para retiros
- [ ] Documentar para cajeros/operadores

---

## 🎯 Próximos Pasos

1. **Asignar roles a usuarios existentes**
2. **Crear panel de cajero** para visualizar y procesar retiros
3. **Implementar notificaciones** cuando un jugador gane (email/SMS)
4. **Sistema de alertas** para retiros de alto valor
5. **Dashboard de métricas** para admin (retiros por día, promedio, etc.)

---

**Última actualización:** 5 de diciembre de 2025  
**Versión:** 1.0 - Sistema de Retiros con Regla de 20 Minutos
