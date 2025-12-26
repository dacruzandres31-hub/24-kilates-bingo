const pool = require('../db');

/**
 * SISTEMA DE CARTONES DE REGALO
 * 
 * Permite a SuperAdmins (específicamente Andy) gestionar cartones de regalo
 * que se rastrean por separado de los cartones normales hasta su uso.
 * 
 * Funcionalidades:
 * - Agregar/quitar cartones de regalo por sala
 * - Consultar stock de cartones de regalo
 * - Registrar uso de cartones de regalo en compras
 * - Historial de movimientos
 */

/**
 * POST /api/admin/gift-cards/add
 * Agrega cartones de regalo a un usuario
 */
async function addGiftCards(req, res) {
  try {
    const { userId, room, quantity, isGift } = req.body;
    const adminId = req.user.id;
    const adminRole = req.user.role;

    // Solo SuperAdmins pueden gestionar cartones de regalo
    if (adminRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Solo SuperAdmins pueden gestionar cartones de regalo'
      });
    }

    if (!userId || !room || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const validRooms = ['bronce', 'plata', 'oro'];
    if (!validRooms.includes(room)) {
      return res.status(400).json({
        success: false,
        error: 'Sala inválida'
      });
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'La cantidad debe ser un número positivo'
      });
    }

    // Crear/actualizar registro en user_card_inventory con is_gift = TRUE
    const [existing] = await pool.query(
      `SELECT id, quantity FROM user_card_inventory 
       WHERE user_id = ? AND room = ? AND is_gift = TRUE
       LIMIT 1`,
      [userId, room]
    );

    if (existing.length > 0) {
      // Actualizar existente
      await pool.query(
        `UPDATE user_card_inventory 
         SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [quantityNum, existing[0].id]
      );
    } else {
      // Crear nuevo registro
      await pool.query(
        `INSERT INTO user_card_inventory 
         (user_id, room, quantity, is_gift, created_at, updated_at)
         VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, room, quantityNum]
      );
    }

    // Registrar movimiento en log
    await pool.query(
      `INSERT INTO card_movements_log 
       (user_id, room, movement_type, quantity, is_gift, reason, executed_by, created_at)
       VALUES (?, ?, 'credit', ?, TRUE, 'Cartones de regalo agregados por SuperAdmin', ?, CURRENT_TIMESTAMP)`,
      [userId, room, quantityNum, adminId]
    );

    // Obtener nuevos totales
    const [totals] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_bronce,
        COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_plata,
        COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_oro
       FROM user_card_inventory
       WHERE user_id = ?`,
      [userId]
    );


    // ============================================
    // EMITIR ACTUALIZACIÓN DE RECURSOS (Socket.IO)
    // ============================================
    // Fix: Emitir evento ROBUSTO que suma Pagos + Regalos
    try {
      const io = req.app.get('io');
      if (io) {
        // Obtener inventario detallado fresco (Pagos + Regalos)
        const [updatedInventory] = await pool.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_bronce,
            COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_plata,
            COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_oro,
            COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_bronce,
            COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_plata,
            COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_oro
          FROM user_card_inventory
          WHERE user_id = ?
        `, [userId]);

        const inv = updatedInventory[0] || {};
        const cartonesTotal = {
          bronce: (parseInt(inv.cards_bronce) || 0) + (parseInt(inv.gift_bronce) || 0),
          plata: (parseInt(inv.cards_plata) || 0) + (parseInt(inv.gift_plata) || 0),
          oro: (parseInt(inv.cards_oro) || 0) + (parseInt(inv.gift_oro) || 0)
        };

        // Obtener balance para consistencia
        const [userData] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);

        io.to(`user_${userId}`).emit('resources_updated', {
          userId: parseInt(userId),
          balance: parseFloat(userData[0]?.balance || 0),
          cartones: cartonesTotal,
          // Datos extra para consistencia
          cards_bronce: parseInt(inv.cards_bronce) || 0,
          cards_plata: parseInt(inv.cards_plata) || 0,
          cards_oro: parseInt(inv.cards_oro) || 0,
          gift_bronce: parseInt(inv.gift_bronce) || 0,
          gift_plata: parseInt(inv.gift_plata) || 0,
          gift_oro: parseInt(inv.gift_oro) || 0,
          message: `${quantityNum} cartones de regalo de ${room} agregados`
        });

        console.log(`📡 [GiftCards] Crédito notificado via Socket a user_${userId} (Total: ${cartonesTotal[room]})`);
      }
    } catch (socketError) {
      console.error('[GiftCards] ⚠️ Error emitiendo socket update en addGiftCards:', socketError);
    }

    res.json({
      success: true,
      message: `${quantityNum} cartones de regalo de ${room} agregados`,
      giftCards: {
        bronce: parseInt(totals[0].gift_bronce) || 0,
        plata: parseInt(totals[0].gift_plata) || 0,
        oro: parseInt(totals[0].gift_oro) || 0
      }
    });

  } catch (error) {
    console.error('❌ Error agregando cartones de regalo:', error);
    res.status(500).json({
      success: false,
      error: 'Error agregando cartones de regalo'
    });
  }
}

/**
 * POST /api/admin/gift-cards/remove
 * Quita cartones de regalo de un usuario
 */
async function removeGiftCards(req, res) {
  try {
    const { userId, room, quantity, isGift } = req.body;
    const adminId = req.user.id;
    const adminRole = req.user.role;

    if (adminRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Solo SuperAdmins pueden gestionar cartones de regalo'
      });
    }

    if (!userId || !room || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'La cantidad debe ser un número positivo'
      });
    }

    // Verificar que tenga suficientes cartones de regalo
    const [inventory] = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0) as total
       FROM user_card_inventory
       WHERE user_id = ? AND room = ? AND is_gift = TRUE`,
      [userId, room]
    );

    const currentCards = parseInt(inventory[0]?.total) || 0;
    if (currentCards < quantityNum) {
      return res.status(400).json({
        success: false,
        error: `El usuario solo tiene ${currentCards} cartones de regalo de ${room}`
      });
    }

    // Quitar cartones de regalo
    let remaining = quantityNum;
    const [giftRecords] = await pool.query(
      `SELECT id, quantity FROM user_card_inventory
       WHERE user_id = ? AND room = ? AND is_gift = TRUE
       ORDER BY id ASC`,
      [userId, room]
    );

    for (const record of giftRecords) {
      if (remaining <= 0) break;

      const toRemove = Math.min(record.quantity, remaining);
      await pool.query(
        `UPDATE user_card_inventory 
         SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [toRemove, record.id]
      );

      remaining -= toRemove;
    }

    // Eliminar registros con cantidad 0
    await pool.query(
      `DELETE FROM user_card_inventory WHERE quantity = 0`
    );

    // Registrar movimiento
    await pool.query(
      `INSERT INTO card_movements_log 
       (user_id, room, movement_type, quantity, is_gift, reason, executed_by, created_at)
       VALUES (?, ?, 'debit', ?, TRUE, 'Cartones de regalo removidos por SuperAdmin', ?, CURRENT_TIMESTAMP)`,
      [userId, room, quantityNum, adminId]
    );

    // Obtener nuevos totales
    const [totals] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_bronce,
        COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_plata,
        COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_oro
       FROM user_card_inventory
       WHERE user_id = ?`,
      [userId]
    );

    // ============================================
    // EMITIR ACTUALIZACIÓN DE RECURSOS (Socket.IO)
    // ============================================
    // Fix: Emitir evento ROBUSTO que suma Pagos + Regalos
    try {
      const io = req.app.get('io');
      if (io) {
        // Obtener inventario detallado fresco (Pagos + Regalos)
        const [updatedInventory] = await pool.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_bronce,
            COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_plata,
            COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_oro,
            COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_bronce,
            COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_plata,
            COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_oro
          FROM user_card_inventory
          WHERE user_id = ?
        `, [userId]);

        const inv = updatedInventory[0] || {};
        const cartonesTotal = {
          bronce: (parseInt(inv.cards_bronce) || 0) + (parseInt(inv.gift_bronce) || 0),
          plata: (parseInt(inv.cards_plata) || 0) + (parseInt(inv.gift_plata) || 0),
          oro: (parseInt(inv.cards_oro) || 0) + (parseInt(inv.gift_oro) || 0)
        };

        // Obtener balance para consistencia
        const [userData] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);

        io.to(`user_${userId}`).emit('resources_updated', {
          userId: parseInt(userId),
          balance: parseFloat(userData[0]?.balance || 0),
          cartones: cartonesTotal,
          // Datos extra para consistencia
          cards_bronce: parseInt(inv.cards_bronce) || 0,
          cards_plata: parseInt(inv.cards_plata) || 0,
          cards_oro: parseInt(inv.cards_oro) || 0,
          gift_bronce: parseInt(inv.gift_bronce) || 0,
          gift_plata: parseInt(inv.gift_plata) || 0,
          gift_oro: parseInt(inv.gift_oro) || 0,
          message: `${quantityNum} cartones de regalo de ${room} removidos`
        });

        console.log(`📡 [GiftCards] Débito notificado via Socket a user_${userId} (Total: ${cartonesTotal[room]})`);
      }
    } catch (socketError) {
      console.error('[GiftCards] ⚠️ Error emitiendo socket update en removeGiftCards:', socketError);
    }

    res.json({
      success: true,
      message: `${quantityNum} cartones de regalo de ${room} removidos`,
      giftCards: {
        bronce: parseInt(totals[0].gift_bronce) || 0,
        plata: parseInt(totals[0].gift_plata) || 0,
        oro: parseInt(totals[0].gift_oro) || 0
      }
    });

  } catch (error) {
    console.error('❌ Error removiendo cartones de regalo:', error);
    res.status(500).json({
      success: false,
      error: 'Error removiendo cartones de regalo'
    });
  }
}

/**
 * GET /api/admin/gift-cards/stock/:userId
 * Obtiene el stock de cartones de regalo de un usuario
 */
async function getGiftCardsStock(req, res) {
  try {
    const { userId } = req.params;

    const [totals] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as bronce,
        COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as plata,
        COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as oro
       FROM user_card_inventory
       WHERE user_id = ?`,
      [userId]
    );

    if (!totals[0]) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      giftCards: {
        bronce: parseInt(totals[0].bronce) || 0,
        plata: parseInt(totals[0].plata) || 0,
        oro: parseInt(totals[0].oro) || 0
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo stock de cartones de regalo:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo stock'
    });
  }
}

/**
 * GET /api/admin/gift-cards/history/:userId
 * Obtiene el historial de movimientos de cartones de regalo
 */
async function getGiftCardsHistory(req, res) {
  try {
    const { userId } = req.params;

    const [movements] = await pool.query(
      `SELECT id, user_id, admin_id, room, quantity, movement_type, notes, created_at
       FROM gift_cards_movements
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      movements: movements
    });
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial'
    });
  }
}

module.exports = {
  addGiftCards,
  removeGiftCards,
  getGiftCardsStock,
  getGiftCardsHistory
};
