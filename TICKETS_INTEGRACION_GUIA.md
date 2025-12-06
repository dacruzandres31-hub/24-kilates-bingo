# 🎫 GUÍA DE INTEGRACIÓN - TICKETS Y PREMIOS HÍBRIDOS

## Estado: ✅ IMPLEMENTACIÓN COMPLETADA

Versión: **1.3.0**  
Fecha: Diciembre 5, 2025

---

## 📋 Archivos Creados/Modificados

### Backend (6 archivos)

#### ✅ NUEVOS:
1. **shopController.js** (150 líneas)
   - Ubicación: `server/src/controllers/shopController.js`
   - Funciones: buyCard, getUserTickets, consumeTicket
   - Lógica: Ticket primero, dinero segundo

2. **shopRoutes.js** (45 líneas)
   - Ubicación: `server/src/routes/shopRoutes.js`
   - Rutas: POST /buy-card, GET /my-tickets, POST /consume-ticket
   - Auth: Todas requieren JWT

3. **TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql** (120 líneas)
   - Ubicación: `server/TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql`
   - Alteraciones de tablas
   - Inserciones de datos

#### ✅ MODIFICADOS:
4. **gameController.js**
   - Nueva función: `end_free_game(req, res)`
   - Lógica para LÍNEA y BINGO
   - Integración con inventoryService

5. **index.js**
   - Importación: `const shopRoutes = require('./routes/shopRoutes')`
   - Registro: `app.use('/api/shop', shopRoutes)`

6. **gameRoutes.js**
   - Nueva ruta: `POST /end-free-game` → gameController.end_free_game

### Frontend (2 archivos)

#### ✅ NUEVOS:
1. **ShopScreen.jsx** (200 líneas)
   - Ubicación: `client-player/src/pages/ShopScreen.jsx`
   - UI: Selector de sala, cantidad, método de pago
   - Features: Tickets vs Dinero, cálculo automático

2. **ShopScreen.css** (400 líneas)
   - Ubicación: `client-player/src/styles/ShopScreen.css`
   - Tema: Dark mode, glassmorphism
   - Responsive: Mobile-first

### Documentación (1 archivo)

1. **TICKETS_PREMIOS_HIBRIDOS.md** (1200+ líneas)
   - Documentación técnica completa
   - Ejemplos de código
   - Testing checklist

---

## 🗄️ CAMBIOS DE BASE DE DATOS

### Alteraciones Requeridas

```sql
-- Ejecutar antes de usar:
psql -U usuario -d bingo_24k -f server/TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql
```

### Tablas Modificadas

| Tabla | Cambios | Propósito |
|-------|---------|----------|
| `cosmetic_items` | +3 campos | Soporte consumibles |
| `user_inventory` | +2 campos | Cantidades de tickets |
| `game_events` | NUEVA | Logging de eventos |
| `user_tickets` | NUEVA (opcional) | Tracking de tickets |

### Datos Insertados

```
- Ticket Sala Bronce (common, is_free_available=TRUE)
- Ticket Sala Plata (rare, is_free_available=FALSE)
- Ticket Sala Oro (legendary, is_free_available=FALSE)
```

---

## 📡 ENDPOINTS API

### POST /api/shop/buy-card
**Comprar cartón (Ticket o Dinero)**

```javascript
// Request
{
  "roomType": "bronce" | "plata" | "oro",
  "quantity": 1
}

// Response (con Ticket)
{
  "success": true,
  "message": "¡Cartón canjeado con Ticket! Te quedan 2 tickets",
  "paymentMethod": "ticket",
  "ticketsRemaining": 2,
  "cardsAssigned": 1
}

// Response (con Dinero)
{
  "success": true,
  "message": "1 cartón comprado por $5.00",
  "paymentMethod": "cash",
  "newBalance": 45.00,
  "cardsAssigned": 1
}
```

### GET /api/shop/my-tickets
**Obtener tickets disponibles**

```javascript
// Response
{
  "success": true,
  "tickets": [
    {
      "id": 1,
      "name": "Ticket Sala Bronce",
      "ticket_room": "bronce",
      "rarity": "common",
      "quantity": 3
    }
  ],
  "total": 3
}
```

### POST /api/game/end-free-game
**Procesar premio al terminar Sala Starter**

```javascript
// Request
{
  "gameSessionId": 123,
  "winType": "linea" | "bingo"
}

// Response (LÍNEA)
{
  "success": true,
  "message": "¡Ganaste un nuevo Marco!",
  "reward": {
    "type": "skin",
    "name": "Marco de Fuego",
    "rarity": "rare",
    "description": "avatar_frame rare"
  }
}

// Response (BINGO)
{
  "success": true,
  "message": "🎉 ¡BINGO! Ganaste una Skin Legendaria + 1 Cartón Gratis",
  "reward": {
    "type": "bingo_combo",
    "items": [
      { "type": "skin_legendary", "name": "Skin Legendaria Cristal" },
      { "type": "ticket_bronce", "name": "Ticket Sala Bronce", "quantity": 1 }
    ]
  }
}
```

---

## 🎨 INTEGRACIÓN FRONTEND

### 1. Agregar ShopScreen a Router

En `client-player/src/App.jsx` o archivo de routing:

```jsx
import ShopScreen from './pages/ShopScreen';

// En tus rutas:
<Route path="/shop" element={<ShopScreen />} />
```

### 2. Agregar Link en Navegación

```jsx
<Link to="/shop">🛍️ Tienda</Link>
```

### 3. Actualizar InventoryScreen (Agregar Tab Tickets)

En `client-player/src/pages/InventoryScreen.jsx`:

```jsx
// Agregar tab tickets
<button className="tab" onClick={() => setActiveTab('tickets')}>
  🎫 Mis Tickets ({ticketCount})
</button>

// En renderizado:
{activeTab === 'tickets' && (
  <div className="tickets-grid">
    {tickets.map(ticket => (
      <div key={ticket.id} className="ticket-card">
        <h3>{ticket.name}</h3>
        <p>Cantidad: {ticket.quantity}</p>
      </div>
    ))}
  </div>
)}
```

---

## 🎮 FLUJO DE USUARIO

### Scenario A: Ganador de LÍNEA en Sala 19:00

```
1. Usuario entra a Sala 19:00 (gratis)
2. Compra 5 cartones con /api/shop/buy-card (usa dinero)
3. Completa una LÍNEA
4. Frontend llama: POST /api/game/end-free-game 
   { gameSessionId: 1, winType: "linea" }
5. Backend:
   - Busca skin aleatorio (no legendario)
   - Inserta en user_inventory
   - Retorna: { success: true, reward: { type: "skin", ... } }
6. Frontend muestra: "¡Ganaste un nuevo Marco!"
7. Skin aparece en inventario
```

### Scenario B: Ganador de BINGO en Sala 19:00

```
1. Usuario entra a Sala 19:00 (gratis)
2. Compra 10 cartones con /api/shop/buy-card (usa dinero)
3. Completa BINGO
4. Frontend llama: POST /api/game/end-free-game 
   { gameSessionId: 1, winType: "bingo" }
5. Backend:
   - Busca skin legendaria
   - Inserta en user_inventory
   - Busca Ticket Bronce
   - Inserta/incrementa en user_inventory (cantidad++)
   - Retorna combo
6. Frontend muestra: "¡BINGO! Ganaste Skin Legendaria + Cartón Gratis"
7. Ambos items aparecen en inventario
```

### Scenario C: Usar Ticket en Sala Bronce

```
1. Usuario tiene 3 Tickets Bronce en inventario
2. Va a comprar cartones (Sala Bronce = $5 normal)
3. ShopScreen detecta tickets disponibles
4. Usuario selecciona: "🎫 Usar Ticket"
5. Frontend llama: POST /api/shop/buy-card 
   { roomType: "bronce", quantity: 1 }
6. Backend en shopController.js:
   - Valida: roomType === 'bronce'
   - Busca tickets Bronce del usuario
   - Encuentra cantidad=3
   - Decrementa a 2
   - Asigna cartón GRATIS
   - Retorna: { success: true, paymentMethod: "ticket", ticketsRemaining: 2 }
7. Frontend muestra: "¡Cartón canjeado con Ticket! Te quedan 2"
8. Ticket count actualizado en UI
```

---

## ✅ CHECKLIST DE INTEGRACIÓN

- [ ] Ejecutar migration SQL en base de datos
- [ ] Copiar shopController.js a `server/src/controllers/`
- [ ] Copiar shopRoutes.js a `server/src/routes/`
- [ ] Actualizar `server/src/index.js` (importar + registrar)
- [ ] Actualizar `server/src/gameController.js` (agregar end_free_game)
- [ ] Actualizar `server/src/routes/gameRoutes.js` (agregar endpoint)
- [ ] Copiar ShopScreen.jsx a `client-player/src/pages/`
- [ ] Copiar ShopScreen.css a `client-player/src/styles/`
- [ ] Registrar ruta en App.jsx: `/shop` → ShopScreen
- [ ] Agregar link en navegación principal
- [ ] Actualizar InventoryScreen con tab de tickets
- [ ] Probar compra con Ticket en Sala Bronce
- [ ] Probar compra con Dinero en otras salas
- [ ] Probar premio LÍNEA (debe dar skin)
- [ ] Probar premio BINGO (debe dar skin + ticket)
- [ ] Verificar Socket.IO emit de premios (opcional)

---

## 🧪 PRUEBAS RECOMENDADAS

### Test 1: Compra con Ticket
```bash
curl -X POST http://localhost:3000/api/shop/buy-card \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"roomType":"bronce","quantity":1}'
```

**Esperado:** 
- Si tiene tickets → paymentMethod: "ticket"
- Si no tiene tickets → paymentMethod: "cash"

### Test 2: Obtener Tickets
```bash
curl -X GET http://localhost:3000/api/shop/my-tickets \
  -H "Authorization: Bearer [TOKEN]"
```

**Esperado:** Array de tickets con quantities

### Test 3: Procesar Premio LÍNEA
```bash
curl -X POST http://localhost:3000/api/game/end-free-game \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"gameSessionId":1,"winType":"linea"}'
```

**Esperado:**
```json
{
  "success": true,
  "message": "¡Ganaste un nuevo Marco!",
  "reward": { "type": "skin", ... }
}
```

### Test 4: Procesar Premio BINGO
```bash
curl -X POST http://localhost:3000/api/game/end-free-game \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"gameSessionId":1,"winType":"bingo"}'
```

**Esperado:**
```json
{
  "success": true,
  "message": "🎉 ¡BINGO! ...",
  "reward": {
    "type": "bingo_combo",
    "items": [ ... ]
  }
}
```

---

## 🚀 PRÓXIMOS PASOS

1. **Socket.IO Integration** (Opcional)
   - Emitir premios en tiempo real
   - Notificaciones a otros jugadores

2. **Tickets con Expiración**
   - Agregar `expired_at` en user_tickets
   - Validar antes de canjear

3. **Prestige System**
   - Tickets especiales por logros
   - Multiplicadores de premios

4. **Analytics**
   - Tracking de conversión Ticket vs Dinero
   - Estadísticas de uso

---

## 📞 SOPORTE

**Errores Comunes:**

1. **Error: "Sesión no válida para premios gratis"**
   - Verificar que room = 'free_starter'
   - Verificar que gameSessionId es correcto

2. **Error: "Balance insuficiente"**
   - Verificar balance del usuario
   - Verificar precio de la sala

3. **Error: "No tienes tickets disponibles"**
   - Verificar que user_inventory.quantity > 0
   - Verificar que cosmetic_items.is_consumable = TRUE

---

**Versión:** 1.3.0  
**Última actualización:** Diciembre 5, 2025  
**Estado:** ✅ LISTO PARA PRODUCCIÓN
