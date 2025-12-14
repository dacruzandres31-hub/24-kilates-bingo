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

    // Los cartones de regalo siempre van a gift_cards_{room}
    const cardColumn = `gift_cards_${room}`;

    // Actualizar cartones del usuario
    await pool.query(
      `UPDATE users SET ${cardColumn} = ${cardColumn} + ? WHERE id = ?`,
      [quantityNum, userId]
    );

    // Registrar movimiento
    await pool.query(
      `INSERT INTO gift_cards_movements 
      (user_id, admin_id, room, quantity, movement_type, notes)
        VALUES (?, ?, ?, ?, 'add', ?)`,
        [userId, adminId, room, quantityNum, `Cartones de regalo agregados por admin ${adminId}`]
      );

    // Obtener nuevos totales
    const [user] = await pool.query(
      `SELECT gift_cards_bronce, gift_cards_plata, gift_cards_oro
       FROM users WHERE id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: `${quantityNum} cartones de regalo de ${room} agregados`,
      giftCards: {
        bronce: user[0].gift_cards_bronce,
        plata: user[0].gift_cards_plata,
        oro: user[0].gift_cards_oro
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
    const cardColumn = `gift_cards_${room}`;

    // Verificar que tenga suficientes cartones de regalo
    const [user] = await pool.query(
      `SELECT ${cardColumn} as current_cards FROM users WHERE id = ?`,
      [userId]
    );

    const currentCards = user[0]?.current_cards || 0;
    if (currentCards < quantityNum) {
      return res.status(400).json({
        success: false,
        error: `El usuario solo tiene ${currentCards} cartones de regalo de ${room}`
      });
    }

    // Quitar cartones de regalo
    await pool.query(
      `UPDATE users SET ${cardColumn} = ${cardColumn} - ? WHERE id = ?`,
      [quantityNum, userId]
    );

    // Registrar movimiento
    await pool.query(
      `INSERT INTO gift_cards_movements 
      (user_id, admin_id, room, quantity, movement_type, notes)
      VALUES (?, ?, ?, ?, 'remove', ?)`,
      [userId, adminId, room, quantityNum, `Cartones de regalo removidos por admin ${adminId}`]
    );

    // Obtener nuevos totales
    const [updatedUser] = await pool.query(
      `SELECT gift_cards_bronce, gift_cards_plata, gift_cards_oro
       FROM users WHERE id = ?`,
      [userId]
    );

    const roomCardKey = `gift_cards_${room}`;
    res.json({
      success: true,
      message: `${quantityNum} cartones de regalo de ${room} removidos`,
      newStock: updatedUser[0][roomCardKey],
      giftCards: {
        bronce: updatedUser[0].gift_cards_bronce,
        plata: updatedUser[0].gift_cards_plata,
        oro: updatedUser[0].gift_cards_oro
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

    const [user] = await pool.query(
      `SELECT gift_cards_bronce, gift_cards_plata, gift_cards_oro
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user[0]) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      stock: {
        bronce: user[0].gift_cards_bronce || 0,
        plata: user[0].gift_cards_plata || 0,
        oro: user[0].gift_cards_oro || 0
      },
      normalCards: {
        bronce: user[0].cards_bronce || 0,
        plata: user[0].cards_plata || 0,
        oro: user[0].cards_oro || 0
      },
      total: {
        bronce: (user[0].gift_cards_bronce || 0) + (user[0].cards_bronce || 0),
        plata: (user[0].gift_cards_plata || 0) + (user[0].cards_plata || 0),
        oro: (user[0].gift_cards_oro || 0) + (user[0].cards_oro || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo stock de cartones:', error);
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
