const pool = require('../db');

/**
 * GET /api/superadmin/room-settings
 * Obtener configuración de todas las salas
 */
exports.getRoomSettings = async (req, res) => {
  try {
    const [settings] = await pool.query(`
      SELECT 
        room,
        card_price,
        percentage_linea,
        percentage_bingo,
        percentage_acumulado,
        accumulated_pot_pre40,
        updated_at
      FROM room_settings
      ORDER BY FIELD(room, 'bronce', 'plata', 'oro')
    `);

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('[RoomSettings] Error al obtener configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de salas'
    });
  }
};

/**
 * PUT /api/superadmin/room-settings/:room
 * Actualizar precio de cartón de una sala
 */
exports.updateRoomPrice = async (req, res) => {
  try {
    const { room } = req.params;
    const { card_price } = req.body;
    const userId = req.user.id;

    // Validaciones
    if (!['bronce', 'plata', 'oro'].includes(room)) {
      return res.status(400).json({
        success: false,
        message: 'Sala inválida. Debe ser: bronce, plata u oro'
      });
    }

    if (!card_price || card_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio del cartón debe ser mayor a 0'
      });
    }

    // Actualizar precio
    await pool.query(
      `UPDATE room_settings 
       SET card_price = ?, updated_by = ? 
       WHERE room = ?`,
      [card_price, userId, room]
    );

    // Obtener configuración actualizada
    const [updated] = await pool.query(
      'SELECT * FROM room_settings WHERE room = ?',
      [room]
    );

    console.log(`[RoomSettings] 💰 Precio actualizado: ${room} → $${card_price}`);

    res.json({
      success: true,
      message: `Precio de sala ${room} actualizado correctamente`,
      setting: updated[0]
    });
  } catch (error) {
    console.error('[RoomSettings] Error al actualizar precio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar precio de sala'
    });
  }
};

/**
 * PUT /api/superadmin/room-settings/:room/percentages
 * Actualizar porcentajes de distribución (LÍNEA, BINGO, ACUMULADO)
 */
exports.updateRoomPercentages = async (req, res) => {
  try {
    const { room } = req.params;
    const { percentage_linea, percentage_bingo, percentage_acumulado } = req.body;
    const userId = req.user.id;

    // Validaciones
    if (!['bronce', 'plata', 'oro'].includes(room)) {
      return res.status(400).json({
        success: false,
        message: 'Sala inválida'
      });
    }

    // Validar que los porcentajes sumen <= 100
    const total = parseFloat(percentage_linea || 0) + 
                  parseFloat(percentage_bingo || 0) + 
                  parseFloat(percentage_acumulado || 0);

    if (total > 100) {
      return res.status(400).json({
        success: false,
        message: `Los porcentajes suman ${total}%, no pueden superar 100%`
      });
    }

    // Actualizar porcentajes
    await pool.query(
      `UPDATE room_settings 
       SET 
         percentage_linea = ?,
         percentage_bingo = ?,
         percentage_acumulado = ?,
         updated_by = ?
       WHERE room = ?`,
      [percentage_linea, percentage_bingo, percentage_acumulado, userId, room]
    );

    const [updated] = await pool.query(
      'SELECT * FROM room_settings WHERE room = ?',
      [room]
    );

    console.log(`[RoomSettings] 📊 Porcentajes actualizados: ${room}`);

    res.json({
      success: true,
      message: 'Porcentajes actualizados correctamente',
      setting: updated[0]
    });
  } catch (error) {
    console.error('[RoomSettings] Error al actualizar porcentajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar porcentajes'
    });
  }
};

/**
 * POST /api/superadmin/room-settings/:room/reset-accumulated
 * Resetear pozo acumulado Pre-40 (solo SuperAdmin)
 */
exports.resetAccumulatedPot = async (req, res) => {
  try {
    const { room } = req.params;
    const userId = req.user.id;

    if (!['bronce', 'plata', 'oro'].includes(room)) {
      return res.status(400).json({
        success: false,
        message: 'Sala inválida'
      });
    }

    // Resetear a 0
    await pool.query(
      `UPDATE room_settings 
       SET accumulated_pot_pre40 = 0.00, updated_by = ? 
       WHERE room = ?`,
      [userId, room]
    );

    console.log(`[RoomSettings] 🔄 Pozo acumulado reseteado: ${room}`);

    res.json({
      success: true,
      message: `Pozo acumulado de ${room} reseteado a $0`
    });
  } catch (error) {
    console.error('[RoomSettings] Error al resetear pozo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al resetear pozo acumulado'
    });
  }
};

/**
 * GET /api/admin/room-settings/current-pots
 * Obtener pozos actuales de todas las salas (para dashboard)
 */
exports.getCurrentPots = async (req, res) => {
  try {
    const [pots] = await pool.query(`
      SELECT 
        rs.room,
        rs.card_price,
        rs.accumulated_pot_pre40 AS jackpot,
        COALESCE(gs.current_pot_linea, 0) AS current_pot_linea,
        COALESCE(gs.current_pot_bingo, 0) AS current_pot_bingo,
        COALESCE(gs.total_cards_sold, 0) AS cards_sold,
        gs.status,
        gs.id AS session_id
      FROM room_settings rs
      LEFT JOIN game_sessions gs ON gs.room = rs.room 
        AND gs.status IN ('active', 'playing', 'pending')
      ORDER BY FIELD(rs.room, 'bronce', 'plata', 'oro')
    `);

    res.json({
      success: true,
      pots
    });
  } catch (error) {
    console.error('[RoomSettings] Error al obtener pozos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pozos actuales'
    });
  }
};
