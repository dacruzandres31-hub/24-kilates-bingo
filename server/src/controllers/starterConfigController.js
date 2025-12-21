const pool = require('../db');

/**
 * GET /api/superadmin/starter-config
 * Obtener configuración de premios de Sala Starter
 */
const getStarterConfig = async (req, res) => {
  try {
    const [config] = await pool.query(`
      SELECT * FROM v_starter_config
    `);

    if (config.length === 0) {
      // Si no existe, crear configuración por defecto
      await pool.query(`
        INSERT INTO starter_room_config (prizes_linea, prizes_bingo)
        VALUES (2, 5)
      `);
      
      const [newConfig] = await pool.query(`
        SELECT * FROM v_starter_config
      `);
      
      return res.json({
        success: true,
        config: newConfig[0]
      });
    }

    res.json({
      success: true,
      config: config[0]
    });
  } catch (error) {
    console.error('[StarterConfig] Error al obtener configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de Starter'
    });
  }
};

/**
 * PUT /api/superadmin/starter-config
 * Actualizar premios de Sala Starter (solo SuperAdmin)
 */
const updateStarterPrizes = async (req, res) => {
  try {
    const { prizes_linea, prizes_bingo, ticket_room_linea, ticket_room_bingo } = req.body;
    const userId = req.user.id;

    // Validaciones
    if (prizes_linea === undefined || prizes_linea < 0) {
      return res.status(400).json({
        success: false,
        message: 'El premio de línea debe ser mayor o igual a 0'
      });
    }

    if (prizes_bingo === undefined || prizes_bingo < 0) {
      return res.status(400).json({
        success: false,
        message: 'El premio de bingo debe ser mayor o igual a 0'
      });
    }

    // Validar ticket_room values
    const validRooms = ['bronce', 'plata', 'oro'];
    if (ticket_room_linea && !validRooms.includes(ticket_room_linea)) {
      return res.status(400).json({
        success: false,
        message: 'El tipo de ticket para línea debe ser bronce, plata u oro'
      });
    }

    if (ticket_room_bingo && !validRooms.includes(ticket_room_bingo)) {
      return res.status(400).json({
        success: false,
        message: 'El tipo de ticket para bingo debe ser bronce, plata u oro'
      });
    }

    // Verificar si existe configuración
    const [existing] = await pool.query(`
      SELECT id FROM starter_room_config LIMIT 1
    `);

    if (existing.length === 0) {
      // Crear nueva configuración
      await pool.query(`
        INSERT INTO starter_room_config (prizes_linea, ticket_room_linea, prizes_bingo, ticket_room_bingo, updated_by)
        VALUES (?, ?, ?, ?, ?)
      `, [prizes_linea, ticket_room_linea || 'bronce', prizes_bingo, ticket_room_bingo || 'oro', userId]);
    } else {
      // Actualizar configuración existente
      await pool.query(`
        UPDATE starter_room_config 
        SET prizes_linea = ?, ticket_room_linea = ?, prizes_bingo = ?, ticket_room_bingo = ?, updated_by = ?
        WHERE id = ?
      `, [prizes_linea, ticket_room_linea || 'bronce', prizes_bingo, ticket_room_bingo || 'oro', userId, existing[0].id]);
    }

    // Obtener configuración actualizada
    const [updated] = await pool.query(`
      SELECT * FROM v_starter_config
    `);

    console.log(`[StarterConfig] 🎁 Premios actualizados: Línea=${prizes_linea} tickets ${ticket_room_linea}, Bingo=${prizes_bingo} tickets ${ticket_room_bingo}`);

    // Emitir evento Socket.IO para actualizar lobby en tiempo real
    if (req.app.get('io')) {
      req.app.get('io').emit('starter_prizes_updated', {
        prizes_linea,
        ticket_room_linea: ticket_room_linea || 'bronce',
        prizes_bingo,
        ticket_room_bingo: ticket_room_bingo || 'oro',
        message: 'Los premios de Sala Starter han sido actualizados'
      });
    }

    res.json({
      success: true,
      message: 'Premios de Sala Starter actualizados correctamente',
      config: updated[0]
    });
  } catch (error) {
    console.error('[StarterConfig] Error al actualizar premios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar premios de Starter'
    });
  }
};

module.exports = {
  getStarterConfig,
  updateStarterPrizes
};
