# 🎫 TICKETS Y PREMIOS HÍBRIDOS - Sistema Completo

## Visión General

Sistema avanzado de premios que combina:
- **Equipables (Skins/Marcos)** - Cosméticos permanentes
- **Consumibles (Tickets)** - Cartones gratis canjeables

Usuarios que ganan en Sala 19:00 reciben:
- **LÍNEA:** Skin/Marco visual aleatorio
- **BINGO:** Skin legendaria + 1 Ticket Sala Bronce

---

## 1. ACTUALIZACIÓN DE BASE DE DATOS

### Schema SQL - Cambios Necesarios

```sql
-- ========== TABLA: cosmetic_items ==========
-- Agregar soporte para Consumibles
ALTER TABLE cosmetic_items 
ADD COLUMN is_consumable BOOLEAN DEFAULT FALSE,
ADD COLUMN max_uses INT DEFAULT NULL,  -- NULL = infinito uso
ADD COLUMN ticket_room VARCHAR(50);     -- 'bronce', 'plata', 'oro'

-- Ejemplos de ítems a insertar:
-- EQUIPABLES (Skins)
INSERT INTO cosmetic_items (name, type, is_consumable, rarity, is_free_available)
VALUES
  ('Marco de Fuego', 'avatar_frame', FALSE, 'rare', TRUE),
  ('Skin Legendaria Cristal', 'card_skin', FALSE, 'legendary', FALSE);

-- CONSUMIBLES (Tickets)
INSERT INTO cosmetic_items (name, type, is_consumable, rarity, ticket_room, is_free_available)
VALUES
  ('Ticket Sala Bronce', 'ticket', TRUE, 'common', 'bronce', TRUE),
  ('Ticket Sala Plata', 'ticket', TRUE, 'rare', 'plata', FALSE),
  ('Ticket Sala Oro', 'ticket', TRUE, 'legendary', 'oro', FALSE);

-- ========== TABLA: user_inventory ==========
-- Agregar soporte para cantidades (para tickets acumulables)
ALTER TABLE user_inventory 
ADD COLUMN quantity INT DEFAULT 1,
ADD COLUMN is_consumable_type BOOLEAN DEFAULT FALSE;

-- Ejemplo de consulta con tickets:
-- SELECT * FROM user_inventory 
-- WHERE user_id = 1 AND is_consumable_type = TRUE AND quantity > 0;

-- ========== TABLA: user_tickets (NUEVA - Opcional) ==========
-- Tabla especializada para tracking de tickets
CREATE TABLE user_tickets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_type VARCHAR(50) NOT NULL,  -- 'bronce', 'plata', 'oro'
    quantity INT DEFAULT 1,
    expired_at TIMESTAMP,  -- Fecha de expiración (NULL = no expira)
    obtained_from VARCHAR(100),  -- 'free_game', 'store_purchase'
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_user_tickets_user ON user_tickets(user_id);
CREATE INDEX idx_user_tickets_type ON user_tickets(ticket_type);
```

---

## 2. BACKEND - LÓGICA DE PREMIOS (gameController.js)

### Función: end_free_game (Al terminar Sala 19:00)

```javascript
/**
 * end_free_game: Procesar premio cuando termina partida Sala Starter (19:00)
 * 
 * LÍNEA: Skill Visual Aleatorio
 * BINGO: Skill Legendaria + 1 Ticket Sala Bronce
 */
async function end_free_game(req, res) {
  try {
    const { userId, gameSessionId, winType } = req.body;
    // winType: 'linea' | 'bingo'

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validar que sea Sala Starter (19:00)
      const sessionResult = await client.query(
        `SELECT * FROM game_sessions 
         WHERE id = $1 AND room = 'free_starter'`,
        [gameSessionId]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Sesión no válida para premios gratis');
      }

      let rewardMessage = '';
      let rewardData = {};

      if (winType === 'linea') {
        // ======= GANADOR DE LÍNEA =======
        // Obtener skill visual aleatorio (no legendario)
        const skinResult = await client.query(
          `SELECT * FROM cosmetic_items 
           WHERE type IN ('avatar_frame', 'card_skin', 'chat_effect')
           AND is_free_available = TRUE
           AND rarity != 'legendary'
           AND is_consumable = FALSE
           ORDER BY RANDOM() 
           LIMIT 1`
        );

        if (skinResult.rows.length === 0) {
          throw new Error('No hay skins disponibles');
        }

        const skinId = skinResult.rows[0].id;
        const skinName = skinResult.rows[0].name;
        const skinType = skinResult.rows[0].type;

        // Insertar en inventario
        await client.query(
          `INSERT INTO user_inventory (user_id, item_id, equipped, is_consumable_type)
           VALUES ($1, $2, FALSE, FALSE)
           ON CONFLICT (user_id, item_id) DO NOTHING`,
          [userId, skinId]
        );

        rewardMessage = `¡Ganaste un nuevo ${skinType === 'avatar_frame' ? 'Marco' : 'Skin'}!`;
        rewardData = {
          type: 'skin',
          name: skinName,
          rarity: skinResult.rows[0].rarity,
          description: `${skinType} ${skinResult.rows[0].rarity}`
        };

        // Logging
        await client.query(
          `INSERT INTO game_events 
           (user_id, session_id, event_type, details)
           VALUES ($1, $2, 'win_linea_free', $3)`,
          [userId, gameSessionId, JSON.stringify(rewardData)]
        );

      } else if (winType === 'bingo') {
        // ======= GANADOR DE BINGO =======
        // 1. Asignar Skill Legendaria
        const legendaryResult = await client.query(
          `SELECT * FROM cosmetic_items 
           WHERE type IN ('avatar_frame', 'card_skin', 'chat_effect')
           AND rarity = 'legendary'
           AND is_consumable = FALSE
           AND is_free_available = TRUE
           ORDER BY RANDOM() 
           LIMIT 1`
        );

        if (legendaryResult.rows.length > 0) {
          const legendaryId = legendaryResult.rows[0].id;
          
          await client.query(
            `INSERT INTO user_inventory (user_id, item_id, equipped, is_consumable_type)
             VALUES ($1, $2, FALSE, FALSE)
             ON CONFLICT (user_id, item_id) DO NOTHING`,
            [userId, legendaryId]
          );
        }

        // 2. Asignar Ticket Sala Bronce (Consumible)
        const ticketResult = await client.query(
          `SELECT * FROM cosmetic_items 
           WHERE type = 'ticket' 
           AND ticket_room = 'bronce'
           LIMIT 1`
        );

        if (ticketResult.rows.length > 0) {
          const ticketId = ticketResult.rows[0].id;

          // Insertar o incrementar cantidad
          await client.query(
            `INSERT INTO user_inventory (user_id, item_id, quantity, is_consumable_type)
             VALUES ($1, $2, 1, TRUE)
             ON CONFLICT (user_id, item_id) 
             DO UPDATE SET quantity = quantity + 1`,
            [userId, ticketId]
          );
        }

        rewardMessage = `¡BINGO! 🎉 Ganaste una Skin Legendaria + 1 Cartón Gratis para Sala Bronce`;
        rewardData = {
          type: 'bingo_combo',
          items: [
            { type: 'skin_legendary', name: legendaryResult.rows[0]?.name || 'Legendaria' },
            { type: 'ticket_bronce', name: 'Cartón Gratis Sala Bronce', quantity: 1 }
          ]
        };

        // Logging
        await client.query(
          `INSERT INTO game_events 
           (user_id, session_id, event_type, details)
           VALUES ($1, $2, 'win_bingo_free', $3)`,
          [userId, gameSessionId, JSON.stringify(rewardData)]
        );
      }

      await client.query('COMMIT');

      // Notificación en tiempo real (Socket.IO)
      io.to(`user_${userId}`).emit('prize_claimed', {
        success: true,
        message: rewardMessage,
        reward: rewardData
      });

      res.json({
        success: true,
        message: rewardMessage,
        reward: rewardData
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error en end_free_game:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}

// Exportar
module.exports = { end_free_game };
```

---

## 3. BACKEND - LÓGICA DE COMPRA CON TICKETS

### Archivo: shopController.js (NUEVO)

```javascript
const pool = require('../db');

/**
 * buyCard: Comprar cartón con dinero O con Ticket
 * 
 * Lógica:
 * 1. Si room === 'bronce': Intentar usar Ticket primero
 * 2. Si no tiene ticket: Usar dinero normal
 * 3. Si no tiene dinero: Error
 */
async function buyCard(req, res) {
  try {
    const { userId, roomType, quantity = 1 } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ====== PASO 1: Validar room ======
      const roomResult = await client.query(
        `SELECT * FROM game_sessions 
         WHERE room = $1 AND status = 'pending'
         ORDER BY start_time DESC 
         LIMIT 1`,
        [roomType]
      );

      if (roomResult.rows.length === 0) {
        throw new Error(`No hay sesión activa para room: ${roomType}`);
      }

      const room = roomResult.rows[0];
      const cardCost = room.cost;

      // ====== PASO 2: Chequeo de Ticket (Solo Sala Bronce) ======
      if (roomType === 'bronce') {
        console.log(`[ShopController] Verificando tickets para usuario ${userId}`);

        const ticketResult = await client.query(
          `SELECT ui.* FROM user_inventory ui
           JOIN cosmetic_items ci ON ui.item_id = ci.id
           WHERE ui.user_id = $1
           AND ci.ticket_room = 'bronce'
           AND ci.type = 'ticket'
           AND ui.quantity > 0
           LIMIT 1`,
          [userId]
        );

        if (ticketResult.rows.length > 0) {
          // ✅ USUARIO TIENE TICKET - USAR TICKET
          console.log(`✅ Usuario ${userId} tiene ticket disponible`);
          
          const ticketInventoryId = ticketResult.rows[0].id;
          const currentQuantity = ticketResult.rows[0].quantity;

          // Restar 1 al ticket
          const newQuantity = currentQuantity - 1;
          
          if (newQuantity === 0) {
            // Si llega a 0, eliminar del inventario
            await client.query(
              `DELETE FROM user_inventory WHERE id = $1`,
              [ticketInventoryId]
            );
          } else {
            // Si quedan más, actualizar cantidad
            await client.query(
              `UPDATE user_inventory SET quantity = $1 WHERE id = $2`,
              [newQuantity, ticketInventoryId]
            );
          }

          // Asignar cartones gratis
          for (let i = 0; i < quantity; i++) {
            const gridNumbers = generateBingoGrid();
            
            await client.query(
              `INSERT INTO daily_stock_cards 
               (room, serial_number, grid_numbers, play_date, status, price)
               VALUES ($1, $2, $3, $4, 'available', 0.00)`,
              [roomType, `TICKET_${Date.now()}_${i}`, JSON.stringify(gridNumbers), new Date().toISOString().split('T')[0]]
            );
          }

          // Log de transacción
          await client.query(
            `INSERT INTO audit_revenue 
             (user_id, room, amount, card_count, transaction_type, details)
             VALUES ($1, $2, 0.00, $3, 'ticket_redemption', $4)`,
            [userId, roomType, quantity, `Canjeado con Ticket Sala Bronce. Tickets restantes: ${newQuantity}`]
          );

          await client.query('COMMIT');

          return res.json({
            success: true,
            message: `¡Cartón(es) canjeado(s) con Ticket! Te quedan ${newQuantity} tickets`,
            paymentMethod: 'ticket',
            ticketsRemaining: newQuantity
          });
        }
      }

      // ====== PASO 3: Si no tiene ticket OR room != bronce ======
      // Flujo normal de cobro por dinero
      console.log(`[ShopController] Procesando pago de dinero para usuario ${userId}`);

      const userResult = await client.query(
        `SELECT balance FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const userBalance = parseFloat(userResult.rows[0].balance);
      const totalCost = cardCost * quantity;

      // Validar balance
      if (userBalance < totalCost) {
        throw new Error(
          `Balance insuficiente. Necesitas $${totalCost.toFixed(2)}, tienes $${userBalance.toFixed(2)}`
        );
      }

      // Descontar del balance
      await client.query(
        `UPDATE users SET balance = balance - $1 WHERE id = $2`,
        [totalCost, userId]
      );

      // Asignar cartones
      for (let i = 0; i < quantity; i++) {
        const gridNumbers = generateBingoGrid();
        
        await client.query(
          `INSERT INTO daily_stock_cards 
           (room, serial_number, grid_numbers, play_date, status, price)
           VALUES ($1, $2, $3, $4, 'available', $5)`,
          [roomType, `PAID_${Date.now()}_${i}`, JSON.stringify(gridNumbers), new Date().toISOString().split('T')[0], cardCost]
        );
      }

      // Log de transacción
      await client.query(
        `INSERT INTO audit_revenue 
         (user_id, room, amount, card_count, transaction_type)
         VALUES ($1, $2, $3, $4, 'card_purchase')`,
        [userId, roomType, totalCost, quantity]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `${quantity} cartón(es) comprado(s) por $${totalCost.toFixed(2)}`,
        paymentMethod: 'cash',
        newBalance: userBalance - totalCost
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error en buyCard:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * getUserTickets: Obtener tickets disponibles del usuario
 */
async function getUserTickets(req, res) {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT ci.*, ui.quantity
       FROM user_inventory ui
       JOIN cosmetic_items ci ON ui.item_id = ci.id
       WHERE ui.user_id = $1
       AND ci.type = 'ticket'
       AND ui.quantity > 0
       ORDER BY ci.rarity DESC`,
      [userId]
    );

    res.json({
      success: true,
      tickets: result.rows,
      total: result.rows.reduce((sum, t) => sum + t.quantity, 0)
    });
  } catch (error) {
    console.error('❌ Error en getUserTickets:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * consumeTicket: Consumir un ticket
 */
async function consumeTicket(req, res) {
  try {
    const { userId, ticketType } = req.body;
    // ticketType: 'bronce', 'plata', 'oro'

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Buscar ticket
      const ticketResult = await client.query(
        `SELECT ui.* FROM user_inventory ui
         JOIN cosmetic_items ci ON ui.item_id = ci.id
         WHERE ui.user_id = $1
         AND ci.ticket_room = $2
         AND ci.type = 'ticket'
         LIMIT 1`,
        [userId, ticketType]
      );

      if (ticketResult.rows.length === 0 || ticketResult.rows[0].quantity === 0) {
        throw new Error(`No tienes tickets disponibles de tipo: ${ticketType}`);
      }

      const inventoryId = ticketResult.rows[0].id;
      const newQuantity = ticketResult.rows[0].quantity - 1;

      if (newQuantity === 0) {
        await pool.query('DELETE FROM user_inventory WHERE id = $1', [inventoryId]);
      } else {
        await pool.query(
          'UPDATE user_inventory SET quantity = $1 WHERE id = $2',
          [newQuantity, inventoryId]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Ticket ${ticketType} consumido. Te quedan: ${newQuantity}`,
        remaining: newQuantity
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error en consumeTicket:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// Helper: Generar grilla de bingo
function generateBingoGrid() {
  const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
  const grid = [];
  
  for (let col = 0; col < 5; col++) {
    const column = [];
    const [min, max] = ranges[col];
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    for (let row = 0; row < 5; row++) {
      if (col === 2 && row === 2) {
        column.push(0); // FREE
      } else {
        column.push(numbers.pop());
      }
    }
    grid.push(column);
  }
  return grid;
}

module.exports = {
  buyCard,
  getUserTickets,
  consumeTicket
};
```

---

## 4. RUTAS - shopRoutes.js (NUEVO)

```javascript
const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Rutas para Tienda y Compra de Cartones
 * - Con soporte para Tickets (Consumibles)
 * - Con fallback a dinero
 */

// POST: Comprar cartón (Ticket o Dinero)
router.post('/buy-card', authMiddleware, async (req, res) => {
  req.body.userId = req.user.id;
  await shopController.buyCard(req, res);
});

// GET: Obtener tickets del usuario
router.get('/my-tickets', authMiddleware, async (req, res) => {
  req.params.userId = req.user.id;
  await shopController.getUserTickets(req, res);
});

// POST: Consumir un ticket
router.post('/consume-ticket', authMiddleware, async (req, res) => {
  req.body.userId = req.user.id;
  await shopController.consumeTicket(req, res);
});

module.exports = router;
```

---

## 5. INTEGRACIÓN EN index.js

```javascript
// Agregar a server/src/index.js:

const shopRoutes = require('./routes/shopRoutes');

// Registrar rutas
app.use('/api/shop', shopRoutes);
```

---

## 6. FLUJO DE USUARIO COMPLETO

### Scenario A: Ganador de LÍNEA en Sala 19:00
```
1. Usuario entra a Sala 19:00 (gratis)
2. Compra 5 cartones gratis
3. Completa una LÍNEA
4. Sistema ejecuta: end_free_game(userId, 'linea')
5. ✅ Recibe: Skin visual aleatorio (Marco, Skin o Efecto)
6. Notificación: "¡Ganaste un nuevo Marco para tu Avatar!"
```

### Scenario B: Ganador de BINGO en Sala 19:00
```
1. Usuario entra a Sala 19:00 (gratis)
2. Compra 10 cartones gratis
3. Completa BINGO
4. Sistema ejecuta: end_free_game(userId, 'bingo')
5. ✅ Recibe: 
   - Skin Legendaria (rara)
   - 1 Ticket Sala Bronce
6. Notificación: "¡BINGO! Ganaste Skin Legendaria + Cartón Gratis para Sala Bronce"
```

### Scenario C: Usar Ticket en Sala Bronce
```
1. Usuario va a Sala Bronce (costo: $5 por cartón)
2. Hace click en "Comprar Cartón"
3. Sistema detecta: room === 'bronce'
4. Valida: ¿Tiene Tickets Bronce?
5. ✅ SÍ → Consume 1 Ticket, cartón canjeable GRATIS
6. ❌ NO → Solicita $5 de balance

Notificación: "¡Cartón canjeado con Ticket! Te quedan X tickets"
```

---

## 7. ENDPOINTS API

### POST /api/shop/buy-card
Comprar cartón (con Ticket si existe, si no con dinero)

**Request:**
```json
{
  "roomType": "bronce",
  "quantity": 1
}
```

**Response (con Ticket):**
```json
{
  "success": true,
  "message": "¡Cartón canjeado con Ticket! Te quedan 2 tickets",
  "paymentMethod": "ticket",
  "ticketsRemaining": 2
}
```

**Response (con Dinero):**
```json
{
  "success": true,
  "message": "1 cartón comprado por $5.00",
  "paymentMethod": "cash",
  "newBalance": 45.00
}
```

---

### GET /api/shop/my-tickets
Obtener todos los tickets del usuario

**Response:**
```json
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

---

### POST /api/shop/consume-ticket
Consumir un ticket manualmente

**Request:**
```json
{
  "ticketType": "bronce"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket bronce consumido. Te quedan: 2",
  "remaining": 2
}
```

---

## 8. ESTRUCTURA DE DATOS FINAL

### Tabla: user_inventory (ACTUALIZADA)
```
id              | INT (PK)
user_id         | INT (FK)
item_id         | INT (FK)
equipped        | BOOLEAN (para equipables)
quantity        | INT (para consumibles)
is_consumable_type | BOOLEAN (marca si es consumible)
obtained_at     | TIMESTAMP
```

### Tabla: cosmetic_items (ACTUALIZADA)
```
id              | INT (PK)
name            | VARCHAR
type            | VARCHAR ('avatar_frame', 'card_skin', 'chat_effect', 'badge', 'ticket')
is_consumable   | BOOLEAN
quantity        | INT (para tickets)
rarity          | VARCHAR ('common', 'rare', 'legendary')
ticket_room     | VARCHAR ('bronce', 'plata', 'oro') -- NULL si no es ticket
is_free_available | BOOLEAN
asset_url       | VARCHAR
color_hex       | VARCHAR
```

---

## 9. IMPLEMENTACIÓN EN FRONTEND

### InventoryScreen.jsx - Agregar Tab de Tickets

```jsx
// Nuevo tab en InventoryScreen
<button className="tab" onClick={() => setActiveTab('tickets')}>
  🎫 Mis Tickets ({ticketCount})
</button>

// Renderizar tickets
{activeTab === 'tickets' && (
  <div className="tickets-grid">
    {tickets.map(ticket => (
      <div key={ticket.id} className="ticket-card">
        <h3>{ticket.name}</h3>
        <p className="quantity">Cantidad: {ticket.quantity}</p>
        <button onClick={() => consumeTicket(ticket.id)}>
          Usar Ticket
        </button>
      </div>
    ))}
  </div>
)}
```

### ShopScreen.jsx - Selector de Pago (NUEVO)

```jsx
// Selector inteligente: ¿Ticket o Dinero?
{room === 'bronce' && userTickets.length > 0 && (
  <div className="payment-options">
    <label>
      <input 
        type="radio" 
        value="ticket" 
        checked={paymentMethod === 'ticket'}
        onChange={() => setPaymentMethod('ticket')}
      />
      🎫 Usar Ticket Gratis ({userTickets[0].quantity} disponibles)
    </label>
    <label>
      <input 
        type="radio" 
        value="cash"
        checked={paymentMethod === 'cash'}
        onChange={() => setPaymentMethod('cash')}
      />
      💰 Pagar con Dinero (${roomCost})
    </label>
  </div>
)}
```

---

## 10. TESTING CHECKLIST

- [ ] POST /api/shop/buy-card con ticket disponible
- [ ] POST /api/shop/buy-card sin ticket (usa dinero)
- [ ] GET /api/shop/my-tickets retorna tickets correctos
- [ ] Ganador de LÍNEA recibe skin
- [ ] Ganador de BINGO recibe skin + ticket
- [ ] Consumir ticket decrementa quantity
- [ ] Al llegar a 0, ticket se elimina del inventario
- [ ] Notificaciones aparecen en Socket.IO
- [ ] Frontend muestra tab de Tickets
- [ ] Selector de pago funciona en Sala Bronce

---

**Versión:** 1.3.0 - Tickets y Premios Híbridos  
**Estado:** ✅ DOCUMENTADO
