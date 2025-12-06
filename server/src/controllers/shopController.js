/**
 * shopController.js
 * 
 * Lógica de compra de cartones con soporte para:
 * - Tickets (Consumibles) - Prioritario
 * - Dinero (Balance) - Fallback
 * 
 * Versión: 1.3.0
 */

const pool = require('../db');

/**
 * buyCard: Comprar cartón con Ticket (si existe) o Dinero
 * 
 * Flujo:
 * 1. Si room === 'bronce' y tiene tickets → Usa ticket GRATIS
 * 2. Si no tiene tickets o room diferente → Usa dinero
 * 3. Valida balance antes de descontar
 */
async function buyCard(req, res) {
  try {
    const { userId, roomType, quantity = 1 } = req.body;

    // Validar entrada
    if (!userId || !roomType) {
      return res.status(400).json({
        success: false,
        message: 'userId y roomType son requeridos'
      });
    }

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
      const cardCost = parseFloat(room.cost);

      // ====== PASO 2: Chequeo de Ticket (Solo Sala Bronce) ======
      if (roomType === 'bronce') {
        console.log(`[ShopController] Verificando tickets para usuario ${userId}`);

        const ticketResult = await client.query(
          `SELECT ui.id, ui.quantity, ci.name 
           FROM user_inventory ui
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
          const ticketName = ticketResult.rows[0].name;

          // Restar 1 al ticket
          const newQuantity = currentQuantity - 1;
          
          if (newQuantity === 0) {
            // Si llega a 0, eliminar del inventario
            await client.query(
              `DELETE FROM user_inventory WHERE id = $1`,
              [ticketInventoryId]
            );
            console.log(`[ShopController] Ticket eliminado (cantidad = 0)`);
          } else {
            // Si quedan más, actualizar cantidad
            await client.query(
              `UPDATE user_inventory SET quantity = $1 WHERE id = $2`,
              [newQuantity, ticketInventoryId]
            );
            console.log(`[ShopController] Tickets restantes: ${newQuantity}`);
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
            [userId, roomType, quantity, `Canjeado con ${ticketName}. Tickets restantes: ${newQuantity}`]
          );

          await client.query('COMMIT');

          return res.json({
            success: true,
            message: `¡Cartón(es) canjeado(s) con Ticket! Te quedan ${newQuantity} tickets`,
            paymentMethod: 'ticket',
            ticketsRemaining: newQuantity,
            cardsAssigned: quantity
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
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Balance insuficiente. Necesitas $${totalCost.toFixed(2)}, tienes $${userBalance.toFixed(2)}`
        });
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
        newBalance: userBalance - totalCost,
        cardsAssigned: quantity
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
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
      `SELECT ci.id, ci.name, ci.ticket_room, ci.rarity, ui.quantity
       FROM user_inventory ui
       JOIN cosmetic_items ci ON ui.item_id = ci.id
       WHERE ui.user_id = $1
       AND ci.type = 'ticket'
       AND ui.quantity > 0
       ORDER BY ci.rarity DESC, ci.name ASC`,
      [userId]
    );

    const totalTickets = result.rows.reduce((sum, t) => sum + t.quantity, 0);

    res.json({
      success: true,
      tickets: result.rows,
      total: totalTickets
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
 * consumeTicket: Consumir un ticket manualmente
 */
async function consumeTicket(req, res) {
  try {
    const { userId, ticketType } = req.body;
    // ticketType: 'bronce', 'plata', 'oro'

    if (!userId || !ticketType) {
      return res.status(400).json({
        success: false,
        message: 'userId y ticketType son requeridos'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Buscar ticket
      const ticketResult = await client.query(
        `SELECT ui.id, ui.quantity FROM user_inventory ui
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
        await client.query('DELETE FROM user_inventory WHERE id = $1', [inventoryId]);
      } else {
        await client.query(
          'UPDATE user_inventory SET quantity = $1 WHERE id = $2',
          [newQuantity, inventoryId]
        );
      }

      // Log
      await client.query(
        `INSERT INTO game_events (user_id, event_type, details)
         VALUES ($1, 'ticket_consumed', $2)`,
        [userId, JSON.stringify({ ticketType, remainingTickets: newQuantity })]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Ticket ${ticketType} consumido. Te quedan: ${newQuantity}`,
        remaining: newQuantity
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
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

/**
 * Helper: Generar grilla de bingo 5x5
 * 
 * Columnas:
 * B: 1-15
 * I: 16-30
 * N: 31-45
 * G: 46-60
 * O: 61-75
 * 
 * Centro: FREE (0)
 */
function generateBingoGrid() {
  const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
  const grid = [];
  
  for (let col = 0; col < 5; col++) {
    const column = [];
    const [min, max] = ranges[col];
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    
    // Fisher-Yates shuffle
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
  consumeTicket,
  generateBingoGrid
};
