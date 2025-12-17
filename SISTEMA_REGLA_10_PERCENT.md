# 📐 Sistema de Regla 10% - Cartones Gratis Máximo

## 📋 Resumen

Sistema de control económico que asegura que los jugadores mantengan una proporción saludable de cartones pagos vs gratis:

**Regla Principal**: Máximo **10% de los cartones seleccionados pueden ser gratis**, el resto deben ser pagos.

---

## 🎯 Objetivos

1. **Control económico**: Evitar abuso del sistema de cartones de regalo
2. **Proporcionalidad**: Asegurar que 90% de cartones en juego sean pagos
3. **Trazabilidad**: Contabilidad exacta de cartones pagos vs gratis en todo momento
4. **Aplicación universal**: La regla aplica en:
   - Selección de cartones en salas pagas (Bronze, Silver, Gold)
   - Transferencias entre agentes
   - Transferencias de agente a jugador

---

## 🗃️ Modelo de Datos

### Tabla `user_card_inventory`

```sql
CREATE TABLE user_card_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  is_gift BOOLEAN DEFAULT false,  -- ✅ Campo clave para distinguir tipo
  quantity INT DEFAULT 1,
  purchase_price DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_room_gift (user_id, room, is_gift)
);
```

**Campos relevantes**:
- `is_gift = 0`: Cartones **PAGOS** (contribuyen a pozos)
- `is_gift = 1`: Cartones **GRATIS** (regalo del SuperAdmin, NO contribuyen a pozos)

---

## ⚙️ Implementaciones

### 1. Selección de Cartones (`cardsController.selectCards`)

**Archivo**: `server/src/controllers/cardsController.js` (líneas 251-450)

**Lógica**:

```javascript
// PASO 1: Verificar disponibilidad por tipo
const [inventory] = await connection.query(`
  SELECT 
    COALESCE(SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END), 0) as paid_quantity,
    COALESCE(SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END), 0) as free_quantity
  FROM user_card_inventory 
  WHERE user_id = ? AND room = ?
`, [userId, room]);

// PASO 2: Calcular distribución con regla 10%
const maxFree = Math.ceil(cardIds.length * 0.10); // Máximo 10% gratis
const actualFree = Math.min(maxFree, availableFree);
const needPaid = cardIds.length - actualFree;

// PASO 3: Validar tickets pagos suficientes
if (needPaid > availablePaid) {
  return res.status(400).json({ 
    error: 'No tienes suficientes tickets PAGOS. Máximo 10% pueden ser gratis.',
    required: { paid: needPaid, free: actualFree },
    available: { paid: availablePaid, free: availableFree }
  });
}

// PASO 4: Descontar según proporción calculada
// 4a. Descontar tickets PAGOS (is_gift = 0)
// 4b. Descontar tickets GRATIS (is_gift = 1)
```

**Ejemplos**:

| Cartones Seleccionados | Máx Gratis (10%) | Necesarios Pagos | ¿Válido? |
|------------------------|------------------|------------------|----------|
| 10 | 1 | 9 | ✅ Si tiene 9+ pagos |
| 20 | 2 | 18 | ✅ Si tiene 18+ pagos |
| 5 | 1 | 4 | ✅ Si tiene 4+ pagos |
| 100 | 10 | 90 | ✅ Si tiene 90+ pagos |

**Casos Edge**:
- Si solo tiene gratis → ❌ Rechazado (necesita al menos 90% pagos en modo estricto)
- Si tiene 100 pagos + 5 gratis y selecciona 10 → Usa 9 pagos + 1 gratis ✅
- **Si tiene 5 pagos + 100 gratis y selecciona 10 → MODO FLEXIBLE: Usa 5 pagos + 5 gratis (50% gratis)** ⚠️
- **Modo flexible** se activa automáticamente cuando no hay suficientes pagos para cumplir regla 10%

---

### 2. Transferencias (`sp_transfer_cards`)

**Archivo**: `server/SP_TRANSFER_CARDS_10PERCENT_RULE.sql`

**Lógica**:

```sql
-- PASO 1: Verificar disponibilidad por tipo en origen
SELECT 
  COALESCE(SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END), 0)
INTO v_paid_available, v_free_available
FROM user_card_inventory
WHERE user_id = p_from_user_id AND room = p_room;

-- PASO 2: Calcular distribución con regla 10%
SET v_max_free = CEIL(p_quantity * 0.10);
SET v_actual_free = LEAST(v_max_free, v_free_available);
SET v_need_paid = p_quantity - v_actual_free;

-- PASO 3: Validar y transferir
IF v_need_paid > v_paid_available THEN
  SIGNAL SQLSTATE '45000' 
  SET MESSAGE_TEXT = 'Cartones PAGOS insuficientes. Máximo 10% pueden ser gratis.';
END IF;

-- PASO 4: Descontar PAGOS del origen y acreditar al destino
-- PASO 5: Descontar GRATIS del origen y acreditar al destino (si aplica)
```

**Ejemplo transferencia**:
- Agente A tiene: 100 pagos + 50 gratis
- Transfiere 30 a Agente B
- Sistema descuenta: 27 pagos + 3 gratis (10% gratis)
- Agente B recibe: 27 pagos + 3 gratis

**Logs de auditoría**:
```sql
INSERT INTO card_movements_log 
(user_id, room, movement_type, quantity, is_gift, to_user_id, executed_by, reason)
VALUES 
  (from_id, room, 'transfer_out', 27, 0, to_id, admin_id, 'Transferencia PAGOS (regla 10%)'),
  (to_id, room, 'transfer_in', 27, 0, from_id, admin_id, 'Recepción PAGOS (regla 10%)'),
  (from_id, room, 'transfer_out', 3, 1, to_id, admin_id, 'Transferencia GRATIS (regla 10%)'),
  (to_id, room, 'transfer_in', 3, 1, from_id, admin_id, 'Recepción GRATIS (regla 10%)');
```

---

### 3. Endpoint de Estadísticas

**Ruta**: `GET /api/cards/stats`  
**Autenticación**: Bearer Token (SuperAdmin only)  
**Archivo**: `server/src/controllers/cardsController.js`

**Response**:

```json
{
  "success": true,
  "timestamp": "2025-12-13T10:30:00.000Z",
  "by_room": [
    {
      "room": "bronce",
      "total_paid": 1500,
      "total_free": 150,
      "total_cards": 1650,
      "users_with_paid": 25,
      "users_with_free": 12,
      "total_users": 30,
      "free_percentage": 9.09
    },
    {
      "room": "plata",
      "total_paid": 800,
      "total_free": 80,
      "total_cards": 880,
      "users_with_paid": 15,
      "users_with_free": 8,
      "total_users": 18,
      "free_percentage": 9.09
    }
  ],
  "global": {
    "total_paid": 5000,
    "total_free": 500,
    "total_cards": 5500,
    "total_users": 50,
    "free_percentage": 9.09
  },
  "compliance": {
    "rule": "Máximo 10% de cartones pueden ser gratis",
    "compliant": true
  }
}
```

**Uso**:

```powershell
# PowerShell
$headers = @{ "Authorization" = "Bearer YOUR_TOKEN" }
Invoke-RestMethod -Uri "http://localhost:3000/api/cards/stats" -Headers $headers
```

```bash
# cURL
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/cards/stats
```

---

### 4. Vistas Actualizadas

#### `v_superadmin_inventory` (completa con desglose)

```sql
CREATE VIEW v_superadmin_inventory AS
SELECT 
  user_id,
  room,
  SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END) AS normal_cards,
  SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) AS gift_cards,
  SUM(quantity) AS total_cards,
  ROUND(
    (SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) / 
     NULLIF(SUM(quantity), 0) * 100), 
    2
  ) AS free_percentage
FROM user_card_inventory
GROUP BY user_id, room;
```

**Ejemplo query**:
```sql
SELECT * FROM v_superadmin_inventory WHERE free_percentage > 10;
-- Retorna usuarios que EXCEDEN la regla del 10%
```

#### `v_admin_inventory` (solo totales, sin desglose is_gift)

```sql
CREATE VIEW v_admin_inventory AS
SELECT 
  u.id AS user_id,
  u.username,
  u.role,
  uci.room,
  SUM(uci.quantity) AS total_cards,
  ROUND(
    (SUM(CASE WHEN uci.is_gift = 1 THEN uci.quantity ELSE 0 END) / 
     NULLIF(SUM(uci.quantity), 0) * 100), 
    2
  ) AS free_percentage
FROM users u
LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
GROUP BY u.id, u.username, u.role, uci.room
HAVING total_cards > 0;
```

---

## 🚀 Instalación

### Paso 1: Aplicar Migraciones SQL

```powershell
# Ejecutar script automatizado
.\aplicar_regla_10_percent.ps1

# O manualmente:
mysql -u root -p bingo_24k < server\SP_TRANSFER_CARDS_10PERCENT_RULE.sql
mysql -u root -p bingo_24k < server\UPDATE_INVENTORY_VIEWS_PERCENTAGE.sql
```

### Paso 2: Reiniciar Servidor

```powershell
npm run dev -w server
```

### Paso 3: Verificar Logs

Buscar en consola:
```
[Cards] 📐 Distribución calculada - Máx gratis (10%): 2, Gratis a usar: 2, Pagos necesarios: 18
[Cards] ✅ Distribución validada - Usará 18 pagos + 2 gratis (10% gratis)
[Cards] 💰 Descontando 18 tickets PAGOS de 2 registros
[Cards] ✂️ PAGOS: Descontados 10 del registro 45. Quedan: 8
[Cards] 🎁 Descontando 2 tickets GRATIS de 1 registros
```

---

## 🧪 Testing

### Test 1: Selección con Solo Pagos

**Setup**:
- Usuario tiene: 20 pagos, 0 gratis
- Selecciona: 10 cartones

**Resultado esperado**:
```
✅ Descuenta: 10 pagos, 0 gratis
✅ free_percentage = 0%
```

### Test 2: Selección con Mix Pagos/Gratis

**Setup**:
- Usuario tiene: 50 pagos, 20 gratis
- Selecciona: 20 cartones

**Resultado esperado**:
```
✅ Descuenta: 18 pagos, 2 gratis
✅ free_percentage = 10%
```

### Test 3: Edge Case - Modo Flexible

**Setup**:
- Usuario tiene: 5 pagos, 100 gratis
- Selecciona: 10 cartones

**Resultado esperado**:
```
⚠️ MODO FLEXIBLE activado
✅ Descuenta: 5 pagos, 5 gratis
✅ free_percentage = 50% (EXCEDE regla pero permite jugar)
📋 Log: "MODO FLEXIBLE: Usará 5 pagos + 5 gratis (50% gratis - EXCEDE regla 10%)"
```

### Test 4: Transferencia Agente → Jugador

**Setup**:
- Agente tiene: 100 pagos, 50 gratis
- Transfiere: 30 cartones a jugador

**Resultado esperado**:
```sql
-- card_movements_log debe mostrar:
-- 27 transfer_out is_gift=0
-- 3 transfer_out is_gift=1
-- Jugador recibe 27 pagos + 3 gratis
```

### Test 5: Consultar Estadísticas

```powershell
$token = "..." # Token de SuperAdmin
$headers = @{ "Authorization" = "Bearer $token" }
$stats = Invoke-RestMethod -Uri "http://localhost:3000/api/cards/stats" -Headers $headers

# Verificar:
$stats.global.free_percentage -le 10  # Debe ser true
$stats.compliance.compliant            # Debe ser true
```

---

## 📊 Queries Útiles

### Ver inventario con proporción

```sql
SELECT 
  user_id,
  room,
  normal_cards,
  gift_cards,
  total_cards,
  free_percentage,
  CASE 
    WHEN free_percentage <= 10 THEN '✅ OK'
    WHEN free_percentage <= 20 THEN '⚠️ WARNING'
    ELSE '🚫 CRITICAL'
  END AS status
FROM v_superadmin_inventory
ORDER BY free_percentage DESC;
```

### Ver logs de transferencias con regla 10%

```sql
SELECT 
  created_at,
  user_id,
  room,
  movement_type,
  quantity,
  CASE WHEN is_gift = 0 THEN 'PAGO' ELSE 'GRATIS' END AS tipo,
  reason
FROM card_movements_log
WHERE reason LIKE '%regla 10%'
ORDER BY created_at DESC
LIMIT 20;
```

### Detectar usuarios con exceso de gratis

```sql
SELECT 
  u.username,
  v.room,
  v.normal_cards,
  v.gift_cards,
  v.total_cards,
  v.free_percentage
FROM v_superadmin_inventory v
JOIN users u ON v.user_id = u.id
WHERE v.free_percentage > 10
ORDER BY v.free_percentage DESC;
```

---

## 🔐 Seguridad

- ✅ Endpoint `/api/cards/stats` requiere rol SuperAdmin
- ✅ Validación en backend (no solo frontend)
- ✅ Transacciones MySQL aseguran atomicidad
- ✅ Logs de auditoría en `card_movements_log`
- ✅ Constraint UNIQUE evita duplicados en `user_card_inventory`

---

## 📝 Notas Importantes

1. **Sala Starter NO aplica regla**: Sala gratis, acceso ilimitado sin descuento
2. **Redondeo hacia arriba**: `Math.ceil(N * 0.10)` favorece al jugador (ej: 15 cartones → 2 gratis máximo)
3. **FIFO en descuentos**: Descuenta primero de registros más antiguos (por `created_at ASC`)
4. **Limpieza automática**: Registros con `quantity = 0` se eliminan automáticamente
5. **Vistas en tiempo real**: Las vistas se actualizan automáticamente con cada transacción

---

## 🐛 Troubleshooting

### Error: "Cartones PAGOS insuficientes"

**Causa**: Usuario intenta seleccionar/transferir más cartones de los que puede según regla 10%

**Solución**:
```sql
-- Ver inventario del usuario
SELECT * FROM v_superadmin_inventory WHERE user_id = X;

-- Acreditar más cartones PAGOS si necesario
CALL sp_transfer_cards(superadmin_id, user_id, 'bronce', 50, superadmin_id);
```

### Error: "Stored procedure not found"

**Causa**: Migración SQL no aplicada

**Solución**:
```powershell
mysql -u root -p bingo_24k < server\SP_TRANSFER_CARDS_10PERCENT_RULE.sql
```

### Stats retorna `free_percentage > 10`

**Causa**: Inventario antiguo con proporción incorrecta

**Solución**:
```sql
-- Rebalancear manualmente (ajustar según necesidad)
UPDATE user_card_inventory 
SET quantity = FLOOR(quantity * 0.9)
WHERE is_gift = 1 AND user_id = X;
```

---

## 📚 Referencias

- **Copilot Instructions**: `.github/copilot-instructions.md` (línea 150-200)
- **Card Inventory System**: `CARD_INVENTORY_SYSTEM_README.md`
- **Migration History**: `CARD_INVENTORY_MIGRATION_SUMMARY.md`
- **Testing Guide**: `TESTING.md`

---

## ✅ Checklist de Implementación

- [x] Migración `SP_TRANSFER_CARDS_10PERCENT_RULE.sql`
- [x] Migración `UPDATE_INVENTORY_VIEWS_PERCENTAGE.sql`
- [x] Modificación `cardsController.selectCards()` con validación 10%
- [x] Endpoint `GET /api/cards/stats`
- [x] Script PowerShell `aplicar_regla_10_percent.ps1`
- [x] Documentación completa
- [ ] Testing en servidor de desarrollo
- [ ] Testing en producción simulada
- [ ] Aprobación de stakeholders
- [ ] Deploy a producción

---

**Última actualización**: 2025-12-13  
**Versión**: 1.0.0  
**Autor**: GitHub Copilot + Andy (SuperAdmin)
