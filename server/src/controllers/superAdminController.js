const pool = require('../db');
const MoneyMath = require('../utils/moneyMath');
const BingoCardGenerator = require('../utils/cardGenerator');
const auditService = require('../services/auditService');

/**
 * MIDDLEWARE: Verificar que el usuario es SuperAdmin
 */
function requireSuperAdmin(req, res, next) {
  if (req.user.role === 'superadmin' || req.user.username?.toLowerCase() === 'andy') {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Acceso denegado. Solo SuperAdmin (o Andy) puede realizar esta acción.'
  });
}

/**
 * GET /api/superadmin/card-prices
 * Obtiene los precios actuales de los cartones
 */
async function getCardPrices(req, res) {
  try {
    const [prices] = await pool.query(`
      SELECT 
        cp.id,
        cp.room,
        cp.price,
        cp.is_active,
        cp.updated_at,
        u.username as updated_by_username
      FROM card_prices cp
      LEFT JOIN users u ON cp.updated_by = u.id
      WHERE cp.is_active = true
      ORDER BY 
        CASE cp.room
          WHEN 'bronce' THEN 1
          WHEN 'plata' THEN 2
          WHEN 'oro' THEN 3
          WHEN 'free_starter' THEN 4
        END
    `);

    res.json({
      success: true,
      prices: prices.map(p => ({
        ...p,
        price: MoneyMath.toNumber(MoneyMath.decimal(p.price))
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo precios:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo precios de cartones'
    });
  }
}

/**
 * PUT /api/superadmin/card-prices/:room
 * Actualiza el precio de una sala
 * Body: { price: number }
 */
async function updateCardPrice(req, res) {
  try {
    const { room } = req.params;
    const { price } = req.body;

    if (!price || price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Precio inválido'
      });
    }

    const validRooms = ['bronce', 'plata', 'oro', 'free_starter'];
    if (!validRooms.includes(room)) {
      return res.status(400).json({
        success: false,
        error: 'Sala inválida'
      });
    }

    // Desactivar precio anterior
    await pool.query(
      'UPDATE card_prices SET is_active = false WHERE room = ? AND is_active = true',
      [room]
    );

    // Insertar nuevo precio
    await pool.query(
      `INSERT INTO card_prices (room, price, is_active, updated_by)
       VALUES (?, ?, true, ?)`,
      [room, price, req.user.id]
    );

    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'UPDATE_CARD_PRICE',
      details: { room, price },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Precio de sala ${room} actualizado a $${MoneyMath.format(price)}`
    });

  } catch (error) {
    console.error('❌ Error actualizando precio:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando precio'
    });
  }
}

/**
 * POST /api/superadmin/gift-cards
 * Acredita cartones de regalo a un usuario
 * Body: { userId, room, quantity, reason }
 */
async function giftCards(req, res) {
  try {
    const { userId, room, quantity, reason } = req.body;

    if (!userId || !room || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos o inválidos'
      });
    }

    const validRooms = ['bronce', 'plata', 'oro'];
    if (!validRooms.includes(room)) {
      return res.status(400).json({
        success: false,
        error: 'Sala inválida'
      });
    }

    // Verificar que el usuario existe
    const [user] = await pool.query(
      'SELECT id, username FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Actualizar cartones en user_cards
    const columnName = `cards_${room}`;
    await pool.query(
      `INSERT INTO user_cards (user_id, cards_bronce, cards_plata, cards_oro)
       VALUES (?, 0, 0, 0)
       ON DUPLICATE KEY UPDATE ${columnName} = ${columnName} + ?`,
      [userId, quantity]
    );

    // Registrar en tabla de movimientos de regalo (crear si no existe)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        room ENUM('bronce', 'plata', 'oro') NOT NULL,
        quantity INT NOT NULL,
        reason TEXT,
        granted_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (granted_by) REFERENCES users(id)
      )
    `);

    await pool.query(
      `INSERT INTO gift_movements (user_id, room, quantity, reason, granted_by)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, room, quantity, reason || 'Regalo del SuperAdmin', req.user.id]
    );

    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'GIFT_CARDS',
      targetUserId: userId,
      details: { room, quantity, reason },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `✅ ${quantity} cartón(es) de ${room.toUpperCase()} acreditados a ${user[0].username}`
    });

  } catch (error) {
    console.error('❌ Error acreditando cartones de regalo:', error);
    res.status(500).json({
      success: false,
      error: 'Error acreditando cartones de regalo'
    });
  }
}

/**
 * POST /api/superadmin/gift-balance
 * Acredita saldo de regalo a un usuario
 * Body: { userId, amount, reason }
 */
async function giftBalance(req, res) {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos o inválidos'
      });
    }

    // Verificar usuario
    const [user] = await pool.query(
      'SELECT id, username, balance FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const currentBalance = MoneyMath.decimal(user[0].balance || 0);
    const giftAmount = MoneyMath.decimal(amount);
    const newBalance = currentBalance.plus(giftAmount);

    // Actualizar balance
    await pool.query(
      'UPDATE users SET balance = ? WHERE id = ?',
      [MoneyMath.toNumber(newBalance), userId]
    );

    // Registrar movimiento
    await pool.query(
      `INSERT INTO chips_movements (
        user_id, 
        movement_type, 
        amount, 
        balance_after, 
        description,
        created_at
      ) VALUES (?, 'bonus', ?, ?, ?, NOW())`,
      [
        userId,
        amount,
        MoneyMath.toNumber(newBalance),
        reason || `Regalo del SuperAdmin: ${req.user.username}`
      ]
    );

    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'GIFT_BALANCE',
      targetUserId: userId,
      details: { amount, reason },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `✅ $${MoneyMath.format(amount)} acreditados a ${user[0].username}`,
      newBalance: MoneyMath.toNumber(newBalance)
    });

  } catch (error) {
    console.error('❌ Error acreditando saldo de regalo:', error);
    res.status(500).json({
      success: false,
      error: 'Error acreditando saldo de regalo'
    });
  }
}

/**
 * GET /api/superadmin/gift-history
 * Obtiene el historial de regalos otorgados
 */
async function getGiftHistory(req, res) {
  try {
    // Historial de cartones
    const [cardGifts] = await pool.query(`
      SELECT 
        gm.*,
        u.username as recipient_username,
        sa.username as granted_by_username
      FROM gift_movements gm
      JOIN users u ON gm.user_id = u.id
      JOIN users sa ON gm.granted_by = sa.id
      ORDER BY gm.created_at DESC
      LIMIT 100
    `);

    // Historial de saldo
    const [balanceGifts] = await pool.query(`
      SELECT 
        cm.*,
        u.username as recipient_username
      FROM chips_movements cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.movement_type = 'bonus'
      AND cm.description LIKE '%SuperAdmin%'
      ORDER BY cm.created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      cardGifts,
      balanceGifts
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial de regalos'
    });
  }
}

/**
 * GET /api/superadmin/system-stats
 * Estadísticas avanzadas del sistema (solo SuperAdmin)
 */
async function getSystemStats(req, res) {
  try {
    const [stats] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'superadmin') as total_superadmins,
        (SELECT COUNT(*) FROM users WHERE role = 'agente') as total_agentes,
        (SELECT COUNT(*) FROM users WHERE role = 'jugador') as total_jugadores,
        (SELECT SUM(balance) FROM users) as total_balance_sistema,
        (SELECT COUNT(*) FROM game_sessions WHERE status = 'active') as sesiones_activas,
        (SELECT COUNT(*) FROM game_sessions WHERE status = 'completed') as sesiones_completadas,
        (SELECT SUM(amount) FROM chips_movements WHERE movement_type = 'deposit') as total_depositos,
        (SELECT SUM(amount) FROM chips_movements WHERE movement_type = 'withdrawal') as total_retiros,
        (SELECT SUM(amount) FROM chips_movements WHERE movement_type = 'bonus') as total_bonos
    `);

    res.json({
      success: true,
      stats: stats[0]
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas del sistema'
    });
  }
}

/**
 * GET /api/superadmin/stock/summary
 * Obtiene resumen del stock disponible por sala
 */
async function getStockSummary(req, res) {
  try {
    const [summary] = await pool.query(`
      SELECT 
        room,
        COUNT(*) as total_cards,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
        SUM(CASE WHEN status = 'discarded' THEN 1 ELSE 0 END) as discarded
      FROM daily_stock_cards
      GROUP BY room
      ORDER BY 
        CASE room
          WHEN 'bronce' THEN 1
          WHEN 'plata' THEN 2
          WHEN 'oro' THEN 3
          WHEN 'free_starter' THEN 4
          WHEN 'bronce_regalo' THEN 5
          WHEN 'plata_regalo' THEN 6
          WHEN 'oro_regalo' THEN 7
        END
    `);

    // Separar salas normales de salas de regalo
    const normalRooms = summary.filter(s => !s.room.includes('_regalo'));
    const giftRooms = summary.filter(s => s.room.includes('_regalo'));

    res.json({
      success: true,
      summary: {
        normal: normalRooms,
        regalo: giftRooms,
        total: summary
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo resumen de stock:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo resumen de stock'
    });
  }
}

/**
 * POST /api/superadmin/stock/generate
 * Genera cartones automáticamente para una sala
 * Body: { room, quantity, playDate, playTime }
 */
async function generateStock(req, res) {
  try {
    const { room, quantity, playDate, playTime } = req.body;

    if (!room || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Sala y cantidad son requeridos'
      });
    }

    const isGiftRoom = room.includes('_regalo');

    const validRooms = ['bronce', 'plata', 'oro', 'free_starter', 'bronce_regalo', 'plata_regalo', 'oro_regalo'];
    if (!validRooms.includes(room)) {
      return res.status(400).json({
        success: false,
        error: 'Sala inválida'
      });
    }

    // Las salas de regalo solo pueden ser generadas por SuperAdmin (o Andy)
    if (isGiftRoom && req.user.role !== 'superadmin' && req.user.username?.toLowerCase() !== 'andy') {
      return res.status(403).json({
        success: false,
        error: 'Solo el SuperAdmin puede generar cartones de regalo'
      });
    }

    // Obtener el precio actual de la sala (salas de regalo tienen precio 0)
    let price = 0;
    if (!isGiftRoom) {
      const roomBase = room.replace('_regalo', '');
      const [priceResult] = await pool.query(
        'SELECT price FROM card_prices WHERE room = ? AND is_active = true',
        [roomBase]
      );
      price = priceResult.length > 0 ? priceResult[0].price : 1000;
    }

    // Generar cartones
    const cardsGenerated = [];
    const date = playDate || new Date().toISOString().split('T')[0];
    const time = playTime || '19:00:00';

    for (let i = 0; i < quantity; i++) {
      // Generar número de serie único
      const serialNumber = Date.now() + i;

      // Generar grid de números (BINGO 90: 3x9)
      const gridNumbers = BingoCardGenerator.generateCard();

      await pool.query(
        `INSERT INTO daily_stock_cards (room, serial_number, grid_numbers, play_date, play_time, price, status)
         VALUES (?, ?, ?, ?, ?, ?, 'available')`,
        [room, serialNumber, JSON.stringify(gridNumbers), date, time, price]
      );

      cardsGenerated.push({
        serial: serialNumber,
        room,
        price
      });
    }

    // Registrar en auditoría
    const auditReason = isGiftRoom ? `Stock de REGALO generado (${room})` : `Stock generado automáticamente`;
    await pool.query(
      `INSERT INTO gift_movements (user_id, room, quantity, reason, granted_by)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, room, quantity, auditReason, req.user.id]
    );

    const roomLabel = isGiftRoom ? `${room.replace('_regalo', '').toUpperCase()} REGALO` : room.toUpperCase();

    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'GENERATE_STOCK',
      details: { room, quantity, playDate, playTime },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `✅ ${quantity} cartón(es) de ${roomLabel} generados exitosamente`,
      cardsGenerated: cardsGenerated.length,
      isGiftRoom
    });

  } catch (error) {
    console.error('❌ Error generando stock:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando stock'
    });
  }
}

/**
 * GET /api/superadmin/stock/user/:userId
 * Obtiene el stock disponible para un usuario (Admin/Agente)
 */
async function getUserStock(req, res) {
  try {
    const { userId } = req.params;

    // Verificar que el usuario existe
    const [user] = await pool.query(
      'SELECT id, username, role FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Obtener cartones del usuario en user_cards (conteo por sala)
    const [userCards] = await pool.query(
      `SELECT 
        room,
        COUNT(*) as quantity
       FROM user_cards 
       WHERE user_id = ?
       GROUP BY room`,
      [userId]
    );

    // Convertir a objeto con todas las salas
    const stock = {
      cards_bronce: 0,
      cards_plata: 0,
      cards_oro: 0,
      cards_bronce_regalo: 0,
      cards_plata_regalo: 0,
      cards_oro_regalo: 0
    };

    userCards.forEach(row => {
      stock[`cards_${row.room}`] = row.quantity;
    });

    res.json({
      success: true,
      user: user[0],
      stock
    });

  } catch (error) {
    console.error('❌ Error obteniendo stock de usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo stock de usuario'
    });
  }
}

/**
 * POST /api/superadmin/stock/transfer
 * Transfiere stock del SuperAdmin a un usuario (Admin/Agente)
 * Body: { targetUserId, room, quantity }
 */
async function transferStock(req, res) {
  try {
    const { targetUserId, room, quantity } = req.body;

    if (!targetUserId || !room || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos'
      });
    }

    const isGiftRoom = room.includes('_regalo');

    const validRooms = ['bronce', 'plata', 'oro', 'bronce_regalo', 'plata_regalo', 'oro_regalo'];
    if (!validRooms.includes(room)) {
      return res.status(400).json({
        success: false,
        error: 'Sala inválida'
      });
    }

    // Las salas de regalo solo pueden ser transferidas por SuperAdmin (o Andy)
    if (isGiftRoom && req.user.role !== 'superadmin' && req.user.username?.toLowerCase() !== 'andy') {
      return res.status(403).json({
        success: false,
        error: 'Solo el SuperAdmin puede transferir cartones de regalo'
      });
    }

    // Verificar usuario destino
    const [targetUser] = await pool.query(
      'SELECT id, username, role FROM users WHERE id = ?',
      [targetUserId]
    );

    if (targetUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Acreditar cartones al usuario (insertar filas por cada cartón)
    const values = [];
    for (let i = 0; i < quantity; i++) {
      values.push([targetUserId, room]);
    }

    await pool.query(
      `INSERT INTO user_cards (user_id, room) VALUES ?`,
      [values]
    );

    // Registrar movimiento
    const transferReason = isGiftRoom
      ? `Transferencia de stock de REGALO desde SuperAdmin`
      : `Transferencia de stock desde SuperAdmin`;

    await pool.query(
      `INSERT INTO gift_movements (user_id, room, quantity, reason, granted_by)
       VALUES (?, ?, ?, ?, ?)`,
      [targetUserId, room, quantity, transferReason, req.user.id]
    );

    const roomLabel = isGiftRoom ? `${room.replace('_regalo', '').toUpperCase()} REGALO` : room.toUpperCase();

    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'TRANSFER_STOCK',
      targetUserId,
      details: { room, quantity },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `✅ ${quantity} cartón(es) de ${roomLabel} transferidos a ${targetUser[0].username}`,
      isGiftRoom
    });

  } catch (error) {
    console.error('❌ Error transfiriendo stock:', error);
    res.status(500).json({
      success: false,
      error: 'Error transfiriendo stock'
    });
  }
}

/**
 * Función auxiliar para generar grid de bingo (Mantenida por compatibilidad, pero ya usamos BingoCardGenerator)
 */
function generateBingoGrid() {
  return BingoCardGenerator.generateCard();
}

module.exports = {
  requireSuperAdmin,
  getCardPrices,
  updateCardPrice,
  giftCards,
  giftBalance,
  getGiftHistory,
  getSystemStats,
  getStockSummary,
  generateStock,
  getUserStock,
  transferStock
};
