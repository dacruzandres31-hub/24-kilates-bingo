# 🔧 Problema de Transferencia de Cartones - 13 Diciembre 2025

## Estado Actual: ⚠️ EN PROGRESO - CÓDIGO APLICADO PERO NO TESTEADO

---

## 📋 Resumen del Problema

Durante la implementación del sistema de gift cards, se descubrió un bug crítico en la transferencia de cartones desde el panel de administración:

**Síntoma**: Los cartones NO se deducían del inventario del admin cuando se transferían a usuarios.

**Causa Raíz**: La función `addCardsToUser()` en `adminController.js` usaba:
1. ❌ Tabla legacy `user_cards` en vez de `user_card_inventory` (sistema v1.4.0)
2. ❌ Operaciones INSERT/DELETE que **creaban** nuevos cartones en vez de **transferir** existentes
3. ❌ No manejaba el flag `is_gift` correctamente

---

## 🔍 Investigación Realizada

### 1. Dashboard Mostraba 0 Cartones
**Problema**: Dashboard siempre mostraba 0 en recursos de cartones  
**Causa**: Usaba endpoint `/api/admin/stock-summary` (stock de la casa) en vez de `/api/admin/cards/inventory` (inventario personal del admin)  
**Fix Aplicado**: ✅ Cambiado Dashboard.jsx línea 93

```javascript
// ANTES (INCORRECTO)
axios.get('/api/admin/stock-summary')

// DESPUÉS (CORRECTO)
axios.get('/api/admin/cards/inventory')
```

### 2. Dos Sistemas de Inventario Coexisten
**Sistema Legacy** (user_cards):
- Tabla: `user_cards`
- Almacena cartones individuales (1 fila = 1 cartón)
- NO tiene flag `is_gift`
- Usado por usuarios antiguos (Andy ID 1 tiene 166k+ cartones aquí)

**Sistema v1.4.0** (user_card_inventory):
- Tabla: `user_card_inventory`
- Almacena cantidades agregadas (1 fila = N cartones)
- TIENE flag `is_gift` para distinguir regalos de SuperAdmin
- Views: `v_admin_inventory`, `v_superadmin_inventory`
- Stored Procedures: `sp_transfer_cards`, `sp_add_cards`, etc.

### 3. Transferencias Creaban Cartones en vez de Moverlos
**Código Original** (adminController.js líneas 970-1010):

```javascript
// ❌ INCORRECTO - INSERT crea nuevos cartones
if (quantity > 0) {
  await pool.query(
    `INSERT INTO user_cards (user_id, room, created_at)
     VALUES (?, ?, NOW())`,
    [userId, room]
  );
}

// ❌ INCORRECTO - Chequeaba user_cards (tabla equivocada)
const [cards] = await pool.query(
  `SELECT COUNT(*) as total FROM user_cards 
   WHERE user_id = ? AND room = ?`,
  [userId, room]
);
```

**Evidencia del Bug**:
```powershell
# Inventario ANTES de transfer:
bronce: 100

# Transfer 5 bronce a AndyNew
POST /api/admin/users/add-cards
{ userId: 1037, room: "bronce", quantity: 5 }

# Inventario DESPUÉS:
bronce: 100  # ❌ NO SE DEDUJO!!!
```

---

## ✅ Soluciones Aplicadas

### Fix #1: Dashboard Usa Inventario Correcto
**Archivo**: `client-admin/src/pages/Dashboard.jsx`  
**Línea**: 93  
**Cambio**: `/api/admin/stock-summary` → `/api/admin/cards/inventory`  
**Estado**: ✅ COMPLETADO Y FUNCIONANDO

### Fix #2: addCardsToUser Usa cardInventoryService
**Archivo**: `server/src/controllers/adminController.js`  
**Líneas**: 970-1010  
**Cambio**: Reemplazado raw SQL por `cardInventoryService.transferCards()`  
**Estado**: ⚠️ APLICADO PERO NO TESTEADO

**Código Nuevo**:
```javascript
// ✅ CORRECTO - Usa service layer con is_gift handling
if (quantity > 0) {
  // Admin → Usuario
  await cardInventoryService.transferCards(
    currentUserId,  // from (admin)
    userId,         // to (usuario)
    room,
    quantity,
    currentUserId   // executedBy
  );
} else if (quantity < 0) {
  // Usuario → Admin (devolución)
  await cardInventoryService.transferCards(
    userId,         // from (usuario)
    currentUserId,  // to (admin)
    room,
    Math.abs(quantity),
    currentUserId   // executedBy
  );
}
```

**Beneficios**:
- ✅ Usa `user_card_inventory` (tabla correcta)
- ✅ Llama `sp_transfer_cards` stored procedure
- ✅ Maneja proporción de `is_gift` automáticamente
- ✅ Registra en `card_movements_log`
- ✅ Usa transacciones (atomicidad)

### Fix #3: Collation Mismatch en Stored Procedure
**Problema**: Error al ejecutar `sp_transfer_cards`:
```
Illegal mix of collations (utf8mb4_unicode_ci,IMPLICIT) and (utf8mb4_0900_ai_ci,IMPLICIT)
```

**Causa**: MySQL 8.0 usa `utf8mb4_0900_ai_ci` por defecto, pero algunas tablas tienen `utf8mb4_unicode_ci`

**Solución**: Forzar COLLATE en comparaciones de columna `room`

**Archivo**: `server/FIX_COLLATION_SP_TRANSFER.sql`  
**Estado**: ✅ APLICADO VIA aplicar_fix_collation.ps1

**Cambios en Stored Procedure**:
```sql
-- Parámetro con collation explícita
IN p_room VARCHAR(10) COLLATE utf8mb4_unicode_ci,

-- WHERE clauses con COLLATE forzado
WHERE user_id = p_from_user_id 
  AND room COLLATE utf8mb4_unicode_ci = p_room
```

---

## 🧪 Testing Requerido (PENDIENTE)

### Escenario 1: Transfer Positivo (Admin → Usuario)
```powershell
# 1. Login como TestGiftAdmin
$token = (Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body '{"username":"TestGiftAdmin","password":"GiftTest123!"}' -ContentType "application/json").token

# 2. Verificar inventario ANTES
GET /api/admin/cards/inventory
# Esperado: bronce: 100, plata: 100, oro: 100

# 3. Transferir 5 bronce a AndyNew (1037)
POST /api/admin/users/add-cards
Body: {"userId":1037,"room":"bronce","quantity":5}

# 4. Verificar inventario DESPUÉS
GET /api/admin/cards/inventory
# Esperado: bronce: 95, plata: 100, oro: 100  ✅ -5

# 5. Verificar inventario de AndyNew
GET /api/admin/cards/inventory (como AndyNew)
# Esperado: bronce: +5
```

### Escenario 2: Transfer Negativo (Usuario → Admin)
```powershell
# Transferir -3 bronce (quitar 3 cartones a AndyNew)
POST /api/admin/users/add-cards
Body: {"userId":1037,"room":"bronce","quantity":-3}

# Inventario Admin: bronce: 98  ✅ +3
# Inventario AndyNew: bronce: 2  ✅ -3
```

### Escenario 3: Validación de is_gift
```sql
-- Verificar que la proporción de is_gift se mantiene
SELECT user_id, room, is_gift, quantity 
FROM user_card_inventory 
WHERE user_id IN (1029, 1037);

-- Si admin tenía 80 normales + 20 regalo y transfiere 10
-- Usuario debe recibir: 8 normales + 2 regalo
```

---

## 📁 Archivos Modificados

### Backend
- ✅ `server/src/controllers/adminController.js` - Fix addCardsToUser()
- ✅ `server/FIX_COLLATION_SP_TRANSFER.sql` - Fix stored procedure collation

### Frontend
- ✅ `client-admin/src/pages/Dashboard.jsx` - Fix endpoint inventario

### Scripts
- ✅ `aplicar_fix_collation.ps1` - Script para aplicar fix SQL

---

## 🚀 Próximos Pasos (Para Continuar Mañana)

### Paso 1: Reiniciar Sistema Limpio
```powershell
# Matar procesos
netstat -ano | findstr ":3001"
Stop-Process -Id <PID> -Force

# Iniciar backend
cd server\src
npm run dev

# Iniciar admin frontend
cd client-admin
npm run dev -- --port 5174
```

### Paso 2: Ejecutar Tests
```powershell
# Usar script PowerShell de arriba (Escenarios 1-3)
# Documentar resultados en TESTING_TRANSFER_14DIC.md
```

### Paso 3: Si Tests Pasan
```powershell
# Commit fixes
git add .
git commit -m "fix: Transferencia de cartones usa cardInventoryService v1.4.0"

# Push a repositorio
git push origin main
```

### Paso 4: Si Tests Fallan
- Revisar logs de `sp_transfer_cards` en MySQL
- Verificar que collation fix se aplicó correctamente
- Debuggear cardInventoryService.transferCards() con console.log
- Verificar user_card_inventory tiene datos correctos

---

## 🔗 Referencias

### Documentos Relacionados
- `CARD_INVENTORY_SYSTEM_README.md` - Sistema v1.4.0 completo
- `CARD_INVENTORY_MIGRATION_SUMMARY.md` - Migración a nuevo sistema
- `PUNTOS_CRITICOS_PRODUCCION.md` - MoneyMath y buenas prácticas

### Código Clave
- `server/src/services/cardInventoryService.js` - Service layer
- `server/CARD_INVENTORY_SYSTEM_MIGRATION.sql` - Schema v1.4.0
- `server/src/controllers/giftCardsController.js` - Sistema gift cards (funcionando)

### Base de Datos
```sql
-- Ver inventario actual
SELECT * FROM user_card_inventory WHERE user_id IN (1029, 1037);

-- Ver logs de movimientos
SELECT * FROM card_movements_log WHERE user_id IN (1029, 1037) ORDER BY created_at DESC LIMIT 10;

-- Ver stored procedure
SHOW CREATE PROCEDURE sp_transfer_cards\G
```

---

## ⚠️ Warnings

1. **NO USAR EN PRODUCCIÓN** hasta pasar tests completos
2. **BACKUP DE BD** antes de testing exhaustivo
3. **Verificar collation** en todas las tablas relacionadas
4. **Sistema legacy** (user_cards) sigue activo para usuarios antiguos

---

## 📝 Notas de Debugging

### Terminal Issues
- Puerto 3001 se queda en FIN_WAIT_2 después de Ctrl+C
- Necesita `Stop-Process -Force` antes de reiniciar
- Múltiples terminales PowerShell pueden causar confusion

### MySQL Credentials
- Usuario: `root`
- Password: `SQLroot24K!`
- Base de Datos: `bingo_24k`
- Puerto: `3306` (default)

---

**Última Actualización**: 13 Diciembre 2025 - 21:00 (hora local)  
**Autor**: GitHub Copilot + Andy  
**Estado**: ⚠️ PENDIENTE DE TESTING
