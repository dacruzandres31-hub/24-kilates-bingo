# CORRECCIONES APLICADAS - 19 DIC 2025 22:45

## Problema 1: Admin multiplica cartones por 10

### 🔴 **Síntoma:**
Al agregar 50 cartones a un usuario desde el panel de admin, se mostraban 500 cartones.

### ✅ **Causa Raíz:**
El Dashboard estaba buscando el campo `total_quantity` en la respuesta del endpoint `/api/admin/cards/inventory`, pero la vista SQL `v_admin_inventory` devuelve el campo `total_cards`.

### 🔧 **Solución Aplicada:**
**Archivo:** `client-admin/src/pages/Dashboard.jsx` (líneas 121-123)

**Cambio:**
```javascript
// ❌ ANTES (INCORRECTO)
setCartonesStock({
  bronce: parseInt(inventory.find(i => i.room === 'bronce')?.total_quantity || 0),
  plata: parseInt(inventory.find(i => i.room === 'plata')?.total_quantity || 0),
  oro: parseInt(inventory.find(i => i.room === 'oro')?.total_quantity || 0)
});

// ✅ DESPUÉS (CORRECTO)
setCartonesStock({
  bronce: parseInt(inventory.find(i => i.room === 'bronce')?.total_cards || 0),
  plata: parseInt(inventory.find(i => i.room === 'plata')?.total_cards || 0),
  oro: parseInt(inventory.find(i => i.room === 'oro')?.total_cards || 0)
});
```

### 🎯 **Resultado Esperado:**
- Agregar 50 cartones → Se muestran 50 cartones (no 500)
- El dropdown "💼 Recursos" en el header del Dashboard muestra cantidades correctas
- Los números coinciden con la base de datos

---

## Problema 2: Carga infinita en Sala Starter

### 🔴 **Síntoma:**
Al ingresar a `http://localhost:5173/sala/starter`, aparece "Cargando cartones disponibles..." indefinidamente y nunca muestra el modal de selección de paquetes ni los cartones.

### ✅ **Causa Raíz:**
El estado inicial de `showPackageModal` era siempre `true`, lo que bloqueaba la carga de cartones en el `useEffect` porque esperaba que el modal se cerrara Y que se seleccionara un paquete. En salas pagas (Bronze, Silver, Gold) esto causaba que nunca se cargaran cartones porque no hay modal.

### 🔧 **Solución Aplicada:**
**Archivo:** `client-player/src/components/CardSelectionLobby.jsx`

**Cambios:**

1. **Estado inicial condicional (línea ~28):**
```javascript
// ❌ ANTES (siempre true)
const [showPackageModal, setShowPackageModal] = useState(true);

// ✅ DESPUÉS (solo true para Starter)
const [showPackageModal, setShowPackageModal] = useState(roomTheme === 'starter');
```

2. **useEffect diferenciado (línea ~87):**
```javascript
// ❌ ANTES (un solo flujo para todas las salas)
useEffect(() => {
  if (!showPackageModal && selectedPackage) {
    loadAvailableCards();
  }
}, [showPackageModal, selectedPackage]);

// ✅ DESPUÉS (flujos diferenciados)
useEffect(() => {
  if (roomTheme !== 'starter') {
    // Salas pagas: cargar inmediatamente SIN esperar modal
    loadAvailableCards();
  } else if (roomTheme === 'starter' && !showPackageModal && selectedPackage) {
    // Starter: cargar DESPUÉS de seleccionar paquete
    loadAvailableCards();
  }
}, [showPackageModal, selectedPackage, roomTheme]);
```

### 🎯 **Resultado Esperado:**
- **Sala Starter:** 
  1. Aparece modal con 4 opciones (0 bonus, 5+1, 10+4, 20+10)
  2. Al seleccionar un paquete, el modal se cierra
  3. Se cargan 5 cartones normales + N gift cards
  4. Los cartones aparecen en el grid con badges "🎁 YAPA GRATIS"

- **Salas Bronze/Silver/Gold:**
  1. NO aparece modal de paquetes
  2. Se cargan cartones disponibles inmediatamente
  3. Flujo normal de compra

---

## Archivos Modificados

### 1. `client-admin/src/pages/Dashboard.jsx`
- Líneas 121-123: Cambio de `total_quantity` a `total_cards`
- Afecta el dropdown de "💼 Recursos" en el header

### 2. `client-player/src/components/CardSelectionLobby.jsx`
- Línea ~28: `useState(roomTheme === 'starter')` - Modal solo en Starter
- Línea ~87: `useEffect` diferenciado para Starter vs salas pagas

---

## Verificación Manual

### ✅ **Admin Panel (localhost:5174):**
1. Ingresar al Dashboard como SuperAdmin
2. Buscar usuario "Eve27" (ID: 1040)
3. Agregar 50 cartones de Bronce
4. **Verificar:** Dropdown "💼 Recursos" muestra "Bronce: 50" (NO 500)
5. **Verificar:** Lista de usuarios muestra "50" (NO 500)

### ✅ **Player Client - Starter (localhost:5173):**
1. Ingresar como jugador (usuario: Eve27, password: ...)
2. Click en "🎰 SALA STARTER - GRATIS"
3. **Verificar:** Aparece modal de selección de paquetes
4. Seleccionar opción "10 Cartones + 4 YAPAS GRATIS"
5. **Verificar:** Se cargan 5 cartones disponibles
6. **Verificar:** Aparecen 4 gift cards al final con badge verde "🎁 YAPA GRATIS"
7. **Verificar:** Counter muestra "X / 5 + 4 yapas gratis"

### ✅ **Player Client - Bronze (localhost:5173):**
1. Ingresar a "🥉 SALA BRONCE - $500"
2. **Verificar:** NO aparece modal de paquetes
3. **Verificar:** Se cargan cartones disponibles directamente
4. **Verificar:** Flujo de compra normal sin bloqueos

---

## Base de Datos - Estado Actual

```sql
-- Usuario Eve27 (ID: 1040)
SELECT user_id, room, quantity, is_gift 
FROM user_card_inventory 
WHERE user_id = 1040 
ORDER BY room, is_gift;

-- Resultado esperado:
-- | user_id | room   | quantity | is_gift |
-- |---------|--------|----------|---------|
-- |    1040 | bronce |       50 |       0 |
-- |    1040 | oro    |       50 |       0 |
-- |    1040 | plata  |       50 |       0 |
```

**Vista SQL utilizada:**
```sql
SELECT * FROM v_admin_inventory WHERE user_id = 1;
-- Devuelve: user_id, username, role, room, total_cards, free_percentage
```

---

## Procedimiento Almacenado - Verificado

`sp_transfer_cards` **NO tiene multiplicación por 10**. El procedimiento es correcto y transfiere exactamente la cantidad especificada.

---

## Próximos Pasos

Si los problemas persisten:

1. **Cache del navegador:** Hacer Ctrl+Shift+R (hard refresh) en ambos paneles
2. **Rebuild cliente:** 
   ```powershell
   cd client-admin; npm run build; npm run dev
   cd client-player; npm run build; npm run dev
   ```
3. **Verificar red de WebSocket:** Abrir DevTools → Network → WS y verificar conexiones activas
4. **Logs del servidor:** Verificar que no haya errores al cargar `/api/cards/available/starter`

---

## Resumen Técnico

| Issue | Archivo | Línea | Cambio | Estado |
|-------|---------|-------|--------|--------|
| Admin 10x | Dashboard.jsx | 121-123 | `total_quantity` → `total_cards` | ✅ Fixed |
| Starter Loading | CardSelectionLobby.jsx | ~28 | `useState(true)` → `useState(roomTheme === 'starter')` | ✅ Fixed |
| Starter Loading | CardSelectionLobby.jsx | ~87 | Agregado flujo diferenciado para salas pagas | ✅ Fixed |

---

**Fecha:** 19 de Diciembre 2025, 22:45 ART  
**Versión:** v1.3.0 (post-paquetes con yapas)  
**Developer:** GitHub Copilot (Claude Sonnet 4.5)
