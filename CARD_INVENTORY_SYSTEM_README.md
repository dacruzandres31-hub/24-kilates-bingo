# 🎴 Sistema de Inventario de Cartones v1.4.0

## 📋 Descripción General

Sistema completo de gestión de inventario de cartones con separación de **cartones normales** (pagos) y **cartones de regalo** (gratuitos). Implementa el modelo de negocio de distribución jerárquica con rastreo completo de movimientos y validación para sorteos.

### Características Principales

✅ **Ciclo de Vida Dual**
- Fase 1: Inventario SIN número de serie (duración indefinida)
- Fase 2: Validación CON número de serie (asignado a sorteo específico)

✅ **Visibilidad por Rol**
- SuperAdmin: Ve separación completa (normal/regalo)
- Admin/Cajero: Solo ve totales (regalo invisible)
- Jugador: Solo ve totales

✅ **Distribución de Jackpots**
- Cartones normales: 70% del precio a pozos (15% línea + 50% bingo + 5% pre-40)
- Cartones regalo: 0% a pozos (`contributed_amount = 0`)
- Límite: Máximo 10% de cartones regalo por sesión

✅ **Auditoría Completa**
- Registro de todos los movimientos
- Trazabilidad de créditos, débitos, transferencias y validaciones
- Identificación de ejecutor de cada operación

---

## 🗃️ Estructura de Base de Datos

### Tablas Principales

#### `user_card_inventory`
Cartones en inventario SIN número de serie

```sql
CREATE TABLE user_card_inventory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  is_gift TINYINT(1) DEFAULT 0,
  quantity INT DEFAULT 1,
  purchase_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (user_id, room, is_gift)
);
```

#### `validated_cards`
Cartones validados CON número de serie para sorteo

```sql
CREATE TABLE validated_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  game_session_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  serial_number VARCHAR(50) UNIQUE NOT NULL,
  grid_numbers JSON NOT NULL,
  is_gift TINYINT(1) DEFAULT 0,
  contributed_amount DECIMAL(10,2) DEFAULT 0,
  validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `card_movements_log`
Auditoría de movimientos

```sql
CREATE TABLE card_movements_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  movement_type ENUM('credit', 'debit', 'transfer_in', 'transfer_out', 'validated'),
  quantity INT NOT NULL,
  is_gift TINYINT(1) DEFAULT 0,
  from_user_id INT,
  to_user_id INT,
  reason VARCHAR(255),
  executed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Vistas

#### `v_superadmin_inventory`
Vista completa con separación regalo/normal (solo SuperAdmin)

```sql
SELECT 
  user_id,
  room,
  SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END) AS normal_cards,
  SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) AS gift_cards,
  SUM(quantity) AS total_cards
FROM user_card_inventory
GROUP BY user_id, room;
```

#### `v_admin_inventory`
Vista filtrada solo con totales (Admin/Cajero)

```sql
SELECT 
  user_id,
  room,
  SUM(quantity) AS total_cards
FROM user_card_inventory
GROUP BY user_id, room;
```

---

## 🚀 API Endpoints

### SuperAdmin

#### Acreditar Cartones
```http
POST /api/superadmin/cards/credit
Authorization: Bearer {superadmin_token}
Content-Type: application/json

{
  "user_id": 5,
  "room": "bronce",
  "quantity": 100,
  "is_gift": false,
  "purchase_price": 8000,
  "reason": "Compra inicial - 80% del precio"
}
```

**Response:**
```json
{
  "success": true,
  "message": "100 cartones normales acreditados en sala bronce",
  "newTotal": 100
}
```

#### Ver Inventario de Usuario
```http
GET /api/superadmin/cards/inventory/:userId
Authorization: Bearer {superadmin_token}
```

**Response:**
```json
{
  "success": true,
  "user_id": 5,
  "inventory": [
    {
      "user_id": 5,
      "room": "bronce",
      "normal_cards": 100,
      "gift_cards": 20,
      "total_cards": 120
    }
  ]
}
```

#### Historial de Movimientos
```http
GET /api/superadmin/cards/movements/:userId?limit=50
Authorization: Bearer {superadmin_token}
```

#### Transferir Cartones (Entre Cualquier Usuario)
```http
POST /api/superadmin/cards/transfer
Authorization: Bearer {superadmin_token}
Content-Type: application/json

{
  "from_user_id": 5,
  "to_user_id": 10,
  "room": "bronce",
  "quantity": 50
}
```

#### Ver Todos los Inventarios
```http
GET /api/superadmin/cards/all-inventories
Authorization: Bearer {superadmin_token}
```

---

### Admin / Cajero

#### Ver Mi Inventario (Solo Totales)
```http
GET /api/admin/cards/inventory
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "user_id": 5,
  "username": "admin_user",
  "inventory": [
    {
      "user_id": 5,
      "room": "bronce",
      "total_cards": 120
    }
  ]
}
```

**Nota:** Admin NO ve separación entre normal/regalo

#### Transferir Cartones a Mi Red
```http
POST /api/admin/cards/transfer
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "to_user_id": 10,
  "room": "bronce",
  "quantity": 50
}
```

**Restricción:** Solo puede transferir a usuarios jerárquicamente bajo él

#### Mis Movimientos
```http
GET /api/admin/cards/movements?limit=50
Authorization: Bearer {admin_token}
```

---

### Jugador

#### Validar Cartones para Sorteo
```http
POST /api/game/validate-cards
Authorization: Bearer {player_token}
Content-Type: application/json

{
  "game_session_id": 123,
  "room": "bronce",
  "quantity": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "5 cartones validados para la sesión 123",
  "validatedCards": [
    {
      "serialNumber": "BRONCE-123-1734567890123-0001",
      "grid": [[1,2,3,4,5], [16,17,18,19,20], ...],
      "isGift": false
    },
    ...
  ]
}
```

**Proceso:**
1. ✅ Verifica inventario disponible
2. ✅ Genera serial único por cartón
3. ✅ Valida límite 10% regalo en sesión
4. ✅ Distribuye a jackpots SI es cartón normal:
   - `jackpot_linea += precio * 0.15`
   - `jackpot_bingo += precio * 0.50`
   - `jackpot_pre40 += precio * 0.05`
5. ✅ Reduce inventario
6. ✅ Registra movimiento en log

#### Ver Cartones Validados
```http
GET /api/game/my-validated-cards/:sessionId
Authorization: Bearer {player_token}
```

**Response:**
```json
{
  "success": true,
  "game_session_id": 123,
  "total_cards": 5,
  "cards": [
    {
      "id": 1,
      "serial_number": "BRONCE-123-1734567890123-0001",
      "grid_numbers": [[1,2,3,4,5], ...],
      "is_gift": false,
      "contributed_amount": 7000,
      "validated_at": "2025-12-11T20:30:00.000Z"
    },
    ...
  ]
}
```

#### Ver Mi Inventario
```http
GET /api/game/my-inventory
Authorization: Bearer {player_token}
```

---

## 📊 Flujo de Trabajo

### 1. SuperAdmin Acredita Cartones a Admin

```javascript
// SuperAdmin acredita 100 normales + 20 regalo
POST /api/superadmin/cards/credit
{
  "user_id": 5,  // Admin
  "room": "bronce",
  "quantity": 100,
  "is_gift": false,
  "purchase_price": 8000  // 80% del precio base
}

POST /api/superadmin/cards/credit
{
  "user_id": 5,
  "room": "bronce",
  "quantity": 20,
  "is_gift": true,
  "purchase_price": 0  // Regalo
}
```

**Estado:** Admin tiene 120 cartones bronce (100 normales + 20 regalo)

---

### 2. Admin Transfiere a Cajero

```javascript
// Admin transfiere 50 cartones (automáticamente 41 normales + 9 regalo - proporción 83/17)
POST /api/admin/cards/transfer
{
  "to_user_id": 10,  // Cajero
  "room": "bronce",
  "quantity": 50
}
```

**Resultado:**
- Admin queda con: 59 normales + 11 regalo = 70 total
- Cajero recibe: 41 normales + 9 regalo = 50 total

**Procedimiento:** `sp_transfer_cards` mantiene la proporción automáticamente

---

### 3. Cajero Transfiere a Jugador

```javascript
// Cajero vende 10 cartones al jugador
POST /api/admin/cards/transfer
{
  "to_user_id": 15,  // Jugador
  "room": "bronce",
  "quantity": 10
}
```

**Resultado:**
- Cajero queda con: 33 normales + 7 regalo = 40 total
- Jugador recibe: 8 normales + 2 regalo = 10 total

---

### 4. Jugador Valida Cartones para Sorteo

```javascript
// Jugador entra a sala bronce y valida sus 10 cartones
POST /api/game/validate-cards
{
  "game_session_id": 123,
  "room": "bronce",
  "quantity": 10
}
```

**Proceso:**
1. Sistema verifica límite 10% regalo en sesión 123
2. Genera 10 seriales únicos:
   ```
   BRONCE-123-1734567890123-0001
   BRONCE-123-1734567890124-0002
   ...
   ```
3. Para cada cartón normal (8):
   - Precio bronce: $10,000
   - `jackpot_linea += 1,500` (15%)
   - `jackpot_bingo += 5,000` (50%)
   - `jackpot_pre40 += 500` (5%)
   - `contributed_amount = 7,000`
4. Para cada cartón regalo (2):
   - `contributed_amount = 0`
5. Inventario jugador queda en 0
6. `game_sessions.total_paid_cards += 8`
7. `game_sessions.total_gift_cards += 2`

**Estado Final:**
- Jugador tiene 10 cartones validados para sesión 123
- Inventario jugador: 0 cartones
- Jackpots actualizados:
  - Línea: +$12,000 (8 cartones × $1,500)
  - Bingo: +$40,000 (8 cartones × $5,000)
  - Pre-40: +$4,000 (8 cartones × $500)

---

## 🔐 Reglas de Negocio

### 1. Invisibilidad de Cartones de Regalo

| Rol | Vista | Campo `is_gift` visible |
|-----|-------|------------------------|
| SuperAdmin | `v_superadmin_inventory` | ✅ Sí (normal_cards, gift_cards) |
| Admin/Cajero | `v_admin_inventory` | ❌ No (solo total_cards) |
| Jugador | `v_admin_inventory` | ❌ No (solo total_cards) |

**Implementación:**
- SuperAdmin usa: `cardInventoryService.getInventory(userId, true)`
- Otros usan: `cardInventoryService.getInventory(userId, false)`

---

### 2. Límite 10% Cartones de Regalo

```javascript
// En validateCards():
const giftPercentage = await db.query('SELECT fn_get_gift_percentage(?)', [sessionId]);

if (giftPercentage > 0.10 && cardIsGift) {
  throw new Error('Límite del 10% de cartones de regalo alcanzado');
}
```

**Ejemplo:**
- Sesión tiene 90 cartones validados totales
- Máximo regalo permitido: 9 cartones (10%)
- Si ya hay 9 regalo, NO se pueden validar más de regalo
- Se pueden validar cartones normales sin límite

---

### 3. Distribución de Jackpots

**Precio Cartón Bronce:** $10,000

#### Distribución en Cadena (30% ya distribuido):
- SuperAdmin: 20% ($2,000)
- Admin: 5% ($500)
- Cajero: 15% ($1,500)
- **TOTAL:** 30% ($3,000)

#### Distribución a Pozos (70% al validar):
```javascript
const cardPrice = 10000;

if (is_gift === false) {
  jackpot_linea += cardPrice * 0.15;   // $1,500
  jackpot_bingo += cardPrice * 0.50;   // $5,000
  jackpot_pre40 += cardPrice * 0.05;   //   $500
  // TOTAL: $7,000 (70%)
}

if (is_gift === true) {
  // NO suma a jackpots
  contributed_amount = 0;
}
```

---

### 4. Formato de Serial Number

**Formato:** `{ROOM}-{SESSION_ID}-{TIMESTAMP}-{RANDOM}`

**Ejemplos:**
```
BRONCE-123-1734567890123-0001
PLATA-456-1734567890456-0002
ORO-789-1734567890789-0003
```

**Propiedades:**
- ✅ Único garantizado (constraint UNIQUE en BD)
- ✅ Trazable a sesión específica
- ✅ Timestamp para auditoría
- ✅ Random de 4 dígitos para evitar colisiones

---

## 🧪 Testing

### Ejecutar Tests
```powershell
.\test_card_inventory.ps1
```

### Flujo de Tests
1. ✅ Login como SuperAdmin
2. ✅ Obtener usuarios de la red
3. ✅ Acreditar 100 cartones normales
4. ✅ Acreditar 20 cartones regalo
5. ✅ Ver inventario completo (SuperAdmin)
6. ✅ Login como Admin
7. ✅ Ver inventario filtrado (Admin)
8. ✅ Transferir cartones a jugador
9. ✅ Crear sesión de juego
10. ✅ Validar cartones para sorteo

---

## 📈 Queries Útiles

### Inventario de Todos los Usuarios
```sql
SELECT * FROM v_superadmin_inventory ORDER BY user_id, room;
```

### Cartones Validados en una Sesión
```sql
SELECT 
  player_id,
  serial_number,
  is_gift,
  contributed_amount
FROM validated_cards 
WHERE game_session_id = 123;
```

### Porcentaje de Regalo en Sesión
```sql
SELECT fn_get_gift_percentage(123) AS gift_percentage;
```

### Historial de Movimientos de un Usuario
```sql
SELECT 
  cm.*,
  u1.username AS user_name,
  u2.username AS from_user_name,
  u3.username AS to_user_name,
  u4.username AS executed_by_name
FROM card_movements_log cm
LEFT JOIN users u1 ON cm.user_id = u1.id
LEFT JOIN users u2 ON cm.from_user_id = u2.id
LEFT JOIN users u3 ON cm.to_user_id = u3.id
LEFT JOIN users u4 ON cm.executed_by = u4.id
WHERE cm.user_id = 5
ORDER BY cm.created_at DESC
LIMIT 50;
```

### Estado de Jackpots
```sql
SELECT 
  id,
  room,
  jackpot_linea,
  jackpot_bingo,
  jackpot_pre40,
  total_paid_cards,
  total_gift_cards,
  total_cards_validated
FROM game_sessions 
WHERE status = 'pending'
ORDER BY play_date DESC;
```

---

## 🔧 Troubleshooting

### "Límite del 10% alcanzado"
**Causa:** Sesión ya tiene 10% de cartones de regalo
**Solución:** Validar cartones normales en su lugar

### "Usuario no tiene cartones en esta sala"
**Causa:** Inventario vacío o sala incorrecta
**Solución:** Verificar inventario con `GET /api/game/my-inventory`

### "Solo puede transferir a usuarios de su red"
**Causa:** Admin/Cajero intenta transferir fuera de su jerarquía
**Solución:** Solo transferir a usuarios creados por él o bajo él

### "La sesión está en estado: active"
**Causa:** Intentar validar cartones en sesión que ya empezó
**Solución:** Solo validar en sesiones `status = 'pending'`

---

## 📚 Archivos Relacionados

### Backend
- `server/src/services/cardInventoryService.js` - Lógica de negocio
- `server/src/controllers/cardInventoryController.js` - Endpoints SuperAdmin
- `server/src/controllers/adminController.js` - Endpoints Admin (+ métodos de inventario)
- `server/src/controllers/gameController.js` - Endpoints Jugador (+ validación)
- `server/src/routes/superAdminRoutes.js` - Rutas SuperAdmin
- `server/src/routes/adminRoutes.js` - Rutas Admin
- `server/src/routes/gameRoutes.js` - Rutas Jugador

### Database
- `server/CARD_INVENTORY_SYSTEM_MIGRATION.sql` - Migración completa
- `CARD_INVENTORY_MIGRATION_SUMMARY.md` - Documentación migración

### Testing
- `test_card_inventory.ps1` - Tests PowerShell

---

## 🎯 Próximos Pasos

### Backend ✅ COMPLETADO
- [x] Servicio de inventario
- [x] Endpoints SuperAdmin
- [x] Endpoints Admin/Cajero
- [x] Endpoints Jugador
- [x] Validación con límite 10%
- [x] Distribución a jackpots

### Frontend ⏳ PENDIENTE
- [ ] Panel SuperAdmin: Acreditar cartones
- [ ] Panel Admin: Transferir cartones
- [ ] Selector de cartones en sala (jugador)
- [ ] Indicador visual de % regalo
- [ ] Historial de movimientos

### Integración ⏳ PENDIENTE
- [ ] Conectar validación con compra de cartones actual
- [ ] Migrar sistema antiguo a nuevo inventario
- [ ] Tests de integración completos

---

## 📝 Changelog

### v1.4.0 (2025-12-11)
- ✅ Sistema de inventario de cartones implementado
- ✅ Separación normal/regalo con visibilidad por rol
- ✅ Validación con límite 10% regalo
- ✅ Distribución automática a jackpots (15/50/5)
- ✅ Generación de serial único
- ✅ Auditoría completa de movimientos
- ✅ 3 tablas nuevas + 2 vistas + 1 stored procedure + 1 function
- ✅ 13 endpoints nuevos (5 SuperAdmin + 3 Admin + 3 Jugador + 2 query)

---

**Autor:** Sistema Bingo 24K  
**Versión:** 1.4.0  
**Fecha:** 2025-12-11
