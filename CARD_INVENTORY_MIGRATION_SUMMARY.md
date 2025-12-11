# ✅ Migración del Sistema de Inventario de Cartones - COMPLETADA

**Fecha**: 2025-12-11  
**Archivo**: `server/CARD_INVENTORY_SYSTEM_MIGRATION.sql`  
**Estado**: ✅ Ejecutada exitosamente

---

## 📋 Resumen Ejecutivo

Se implementó un sistema completo de **inventario de cartones** que separa el ciclo de vida de los cartones en dos fases:

1. **Inventario** (sin número de serie) - Cartones almacenados indefinidamente
2. **Validación** (con número de serie) - Cartones asignados a un sorteo específico

Este sistema permite rastrear:
- ✅ Cartones normales (pagos) vs. cartones de regalo
- ✅ Distribución de jackpots (15% línea, 50% bingo, 5% pre-40)
- ✅ Límite del 10% de cartones de regalo por sesión
- ✅ Auditoría completa de movimientos de cartones
- ✅ Vistas específicas por rol (SuperAdmin ve regalo/normal, otros solo totales)

---

## 🗃️ Tablas Creadas

### 1. `user_card_inventory`
**Propósito**: Almacenar cartones SIN número de serie en inventario de usuario

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
  UNIQUE KEY unique_user_room_gift (user_id, room, is_gift)
);
```

**Características**:
- ✅ Cartones duran indefinidamente hasta validación
- ✅ Diferencia entre cartones normales (`is_gift = 0`) y regalo (`is_gift = 1`)
- ✅ Precio de compra registrado para trazabilidad
- ✅ Constraint único por (usuario, sala, tipo)

---

### 2. `validated_cards`
**Propósito**: Cartones validados CON número de serie para sorteo específico

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
  validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_serial (serial_number)
);
```

**Características**:
- ✅ Número de serie ÚNICO generado al validar
- ✅ Grid de números almacenado como JSON
- ✅ `contributed_amount = 0` para cartones de regalo
- ✅ `contributed_amount > 0` para cartones pagos (suma a jackpots)
- ✅ Trazabilidad completa: quién, cuándo, qué sala, qué sesión

---

### 3. `card_movements_log`
**Propósito**: Auditoría completa de todos los movimientos de cartones

```sql
CREATE TABLE card_movements_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  movement_type ENUM('credit', 'debit', 'transfer_in', 'transfer_out', 'validated') NOT NULL,
  quantity INT NOT NULL,
  is_gift TINYINT(1) DEFAULT 0,
  from_user_id INT,
  to_user_id INT,
  reason VARCHAR(255),
  executed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Tipos de Movimiento**:
- `credit`: Acreditación manual por SuperAdmin
- `debit`: Reducción de inventario (corrección)
- `transfer_in`: Recepción de transferencia
- `transfer_out`: Envío de transferencia
- `validated`: Cartón validado para sorteo (consume de inventario)

---

## 🔄 Modificaciones a Tablas Existentes

### `game_sessions`
Se agregaron 6 columnas para tracking de jackpots y cartones:

```sql
jackpot_linea DECIMAL(10,2) DEFAULT 0          -- 15% de cartones pagos
jackpot_bingo DECIMAL(10,2) DEFAULT 0          -- 50% de cartones pagos
jackpot_pre40 DECIMAL(10,2) DEFAULT 0          -- 5% si bingo antes de bola 40
total_cards_validated INT DEFAULT 0             -- Total cartones validados
total_gift_cards INT DEFAULT 0                  -- Cartones regalo (no suman)
total_paid_cards INT DEFAULT 0                  -- Cartones pagos (suman a pozos)
```

**Lógica de Jackpots**:
- Cartones **normales**: Distribuyen 70% del precio (15% línea + 50% bingo + 5% pre-40)
- Cartones **regalo**: `contributed_amount = 0` → No suman a jackpots
- Límite: Máximo 10% de cartones de regalo por sesión

---

## 👁️ Vistas Creadas

### `v_superadmin_inventory`
**Propósito**: Vista COMPLETA para SuperAdmin (ve regalo vs. normales)

```sql
CREATE VIEW v_superadmin_inventory AS
SELECT 
  user_id,
  room,
  SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END) AS normal_cards,
  SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) AS gift_cards,
  SUM(quantity) AS total_cards
FROM user_card_inventory
GROUP BY user_id, room;
```

**Ejemplo**:
| user_id | room   | normal_cards | gift_cards | total_cards |
|---------|--------|--------------|------------|-------------|
| 5       | bronce | 100          | 20         | 120         |
| 5       | plata  | 50           | 10         | 60          |

---

### `v_admin_inventory`
**Propósito**: Vista FILTRADA para Admin/Cajero (solo totales, SIN is_gift)

```sql
CREATE VIEW v_admin_inventory AS
SELECT 
  user_id,
  room,
  SUM(quantity) AS total_cards
FROM user_card_inventory
GROUP BY user_id, room;
```

**Ejemplo**:
| user_id | room   | total_cards |
|---------|--------|-------------|
| 5       | bronce | 120         |
| 5       | plata  | 60          |

**Regla de Negocio**: "Solo yo voy a saber de los cartones de regalo" - SuperAdmin

---

## ⚙️ Procedimientos Almacenados

### `sp_transfer_cards`
**Propósito**: Transferir cartones manteniendo proporción regalo/normal

```sql
CALL sp_transfer_cards(
  p_from_user INT,
  p_to_user INT,
  p_room ENUM('bronce', 'plata', 'oro'),
  p_quantity INT,
  p_executed_by INT
);
```

**Lógica**:
1. Verifica que `p_from_user` tenga cartones disponibles
2. Calcula proporción de regalo vs. normales
3. Transfiere manteniendo la proporción
4. Registra 2 movimientos en `card_movements_log`:
   - `transfer_out` para remitente
   - `transfer_in` para destinatario

**Ejemplo**:
- Usuario tiene: 80 normales + 20 regalo = 100 total (20% regalo)
- Transfiere 50 cartones → 40 normales + 10 regalo

---

## 📊 Funciones Creadas

### `fn_get_gift_percentage`
**Propósito**: Calcular % de cartones de regalo en una sesión

```sql
SELECT fn_get_gift_percentage(session_id);
```

**Retorna**: Porcentaje decimal (0.00 - 1.00)

**Uso**: Validar límite del 10% al validar cartón:

```javascript
const giftPercent = await db.query('SELECT fn_get_gift_percentage(?)', [sessionId]);
if (giftPercent > 0.10 && cardIsGift) {
  throw new Error('Límite del 10% de cartones de regalo alcanzado');
}
```

---

## 🔐 Reglas de Negocio Implementadas

### 1. **Invisibilidad de Cartones de Regalo**
- ✅ SuperAdmin: Ve `normal_cards`, `gift_cards`, `total_cards` (vista `v_superadmin_inventory`)
- ✅ Admin/Cajero: Solo ve `total_cards` (vista `v_admin_inventory`)
- ✅ Campo `is_gift` existe en BD pero invisible en API para no-SuperAdmins

### 2. **Ciclo de Vida de Cartones**
```
INVENTARIO (sin serial)
  ↓ Usuario tiene 100 cartones bronce
  ↓ (user_card_inventory: quantity = 100)
  ↓
VALIDACIÓN (genera serial)
  ↓ Usuario entra a sala y valida 10 cartones
  ↓ (validated_cards: 10 registros con serial_number único)
  ↓ (user_card_inventory: quantity = 90)
  ↓
SORTEO
  ↓ Se juega con esos 10 cartones validados
  ✓ Si es_regalo = false → Suma a jackpots (15% + 50% + 5%)
  ✓ Si es_regalo = true → contributed_amount = 0
```

### 3. **Distribución de Jackpots** (Solo Cartones Pagos)
Precio cartón bronce: $10,000

**Distribución al validar**:
- Ya distribuido en cadena: 30% ($3,000)
  - 20% SuperAdmin ($2,000)
  - 5% Admin ($500)
  - 15% Cajero ($1,500)
- Va a jackpots: 70% ($7,000)
  - 15% Línea ($1,500) → `game_sessions.jackpot_linea += 1500`
  - 50% Bingo ($5,000) → `game_sessions.jackpot_bingo += 5000`
  - 5% Pre-40 ($500) → `game_sessions.jackpot_pre40 += 500`

**Cartones de Regalo**:
- `contributed_amount = 0` → NO suman a jackpots
- Límite: 10% del total de cartones validados

### 4. **Auditoría Completa**
Cada movimiento registra:
- ✅ `user_id`: Afectado
- ✅ `movement_type`: Tipo de operación
- ✅ `quantity`: Cantidad movida
- ✅ `is_gift`: Si son regalo o normales
- ✅ `from_user_id` / `to_user_id`: En transferencias
- ✅ `reason`: Motivo del movimiento
- ✅ `executed_by`: Quién lo ejecutó
- ✅ `created_at`: Timestamp

---

## 🚀 Próximos Pasos

### Backend (Endpoints API)

#### 1. **SuperAdmin - Acreditar Cartones**
```javascript
POST /api/superadmin/cards/credit
{
  "user_id": 5,
  "room": "bronce",
  "quantity": 100,
  "is_gift": false,
  "purchase_price": 8000  // 80% del precio normal
}
```

#### 2. **Admin/Cajero - Transferir Cartones**
```javascript
POST /api/admin/transfer-cards
{
  "to_user_id": 10,
  "room": "bronce",
  "quantity": 50
}
```

#### 3. **Jugador - Validar Cartón para Sorteo**
```javascript
POST /api/player/validate-card
{
  "game_session_id": 123,
  "room": "bronce",
  "quantity": 5
}

// Validaciones:
// - Usuario tiene cartones en inventario
// - No se excede 10% de regalo en sesión
// - Genera serial único por cartón
// - Reduce inventario
// - Suma a jackpots SI is_gift = false
```

#### 4. **Ver Inventario**
```javascript
// SuperAdmin (ve regalo + normal)
GET /api/superadmin/inventory/:user_id
// Usa: v_superadmin_inventory

// Admin/Cajero (solo total)
GET /api/admin/inventory/:user_id
// Usa: v_admin_inventory
```

---

### Frontend (Interfaces)

#### 1. **SuperAdmin Panel**
- ✅ Acreditar cartones (normal/regalo)
- ✅ Ver inventario completo con separación regalo/normal
- ✅ Historial de movimientos

#### 2. **Admin/Cajero Panel**
- ✅ Transferir cartones a cajeros/jugadores
- ✅ Ver inventario (solo totales)
- ✅ Comprar cartones de SuperAdmin

#### 3. **Jugador Panel**
- ✅ Ver inventario disponible
- ✅ Validar cartones al entrar a sala
- ✅ Límite de 10% regalo mostrado en UI

---

## 📈 Métricas y Validación

### Queries de Verificación

```sql
-- Ver inventario de un usuario
SELECT * FROM v_superadmin_inventory WHERE user_id = 5;

-- Verificar % de regalo en sesión
SELECT fn_get_gift_percentage(123) AS gift_percentage;

-- Auditoría de movimientos
SELECT * FROM card_movements_log WHERE user_id = 5 ORDER BY created_at DESC;

-- Estado de jackpots
SELECT 
  id,
  room,
  jackpot_linea,
  jackpot_bingo,
  jackpot_pre40,
  total_paid_cards,
  total_gift_cards
FROM game_sessions 
WHERE status = 'pending';

-- Cartones validados en una sesión
SELECT 
  player_id,
  serial_number,
  is_gift,
  contributed_amount
FROM validated_cards 
WHERE game_session_id = 123;
```

---

## ⚠️ Notas Técnicas

### Sintaxis Corregida
**Problema original**: MySQL 8.0 no soporta `ADD COLUMN IF NOT EXISTS`

**Solución implementada**: 
```sql
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'game_sessions' AND COLUMN_NAME = 'jackpot_linea') > 0,
  'SELECT ''jackpot_linea ya existe'' AS status;',
  'ALTER TABLE game_sessions ADD COLUMN jackpot_linea DECIMAL(10,2) DEFAULT 0;'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;
```

Esta técnica permite:
- ✅ Re-ejecutar migration sin errores
- ✅ Verificar columnas existentes
- ✅ Agregar solo las faltantes

---

## ✅ Checklist de Implementación

### Base de Datos
- [x] Tabla `user_card_inventory` creada
- [x] Tabla `validated_cards` creada
- [x] Tabla `card_movements_log` creada
- [x] Columnas agregadas a `game_sessions`
- [x] Vista `v_superadmin_inventory` creada
- [x] Vista `v_admin_inventory` creada
- [x] Procedimiento `sp_transfer_cards` creado
- [x] Función `fn_get_gift_percentage` creada

### Backend (Pendiente)
- [ ] Endpoint: `POST /api/superadmin/cards/credit`
- [ ] Endpoint: `POST /api/admin/transfer-cards`
- [ ] Endpoint: `POST /api/player/validate-card`
- [ ] Endpoint: `GET /api/superadmin/inventory/:userId`
- [ ] Endpoint: `GET /api/admin/inventory/:userId`
- [ ] Lógica: Validación de 10% límite regalo
- [ ] Lógica: Distribución a jackpots (15/50/5)
- [ ] Lógica: Generación de serial único

### Frontend (Pendiente)
- [ ] SuperAdmin: Panel de acreditación
- [ ] Admin/Cajero: Panel de transferencias
- [ ] Jugador: Selector de cartones en sala
- [ ] Indicador visual: % de regalo en sesión
- [ ] Historial de movimientos

---

## 📚 Referencias

- **Modelo de Negocio**: Ver `copilot-instructions.md`
- **Distribución de Ganancias**: 30% cadena + 70% jackpots
- **Límite Regalo**: 10% máximo por sesión
- **Visibilidad**: SuperAdmin ve todo, otros solo totales

---

**Migración ejecutada**: 2025-12-11 16:45:34  
**Próximo paso**: Implementar endpoints backend para gestión de inventario
