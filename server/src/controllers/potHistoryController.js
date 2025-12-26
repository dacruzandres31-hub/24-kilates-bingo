const pool = require('../db');

/**
 * GET /api/admin/pot-history/:room
 * Obtiene historial de cambios de pozos para una sala
 */
exports.getPotHistory = async (req, res) => {
    try {
        const { room } = req.params;
        const { limit = 50, days = 7 } = req.query;

        // Validar sala
        const validRooms = ['bronce', 'plata', 'oro'];
        if (!validRooms.includes(room)) {
            return res.status(400).json({
                success: false,
                error: 'Sala inválida. Debe ser: bronce, plata u oro'
            });
        }

        // Consultar historial
        const [history] = await pool.query(`
      SELECT 
        ph.*,
        u.username as player_name,
        gs.start_time as session_start
      FROM pot_history ph
      LEFT JOIN users u ON ph.player_id = u.id
      LEFT JOIN game_sessions gs ON ph.session_id = gs.id
      WHERE ph.room = ?
        AND ph.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY ph.created_at DESC
      LIMIT ?
    `, [room, parseInt(days), parseInt(limit)]);

        res.json({
            success: true,
            room,
            history,
            count: history.length
        });

    } catch (error) {
        console.error('[Admin] Error getting pot history:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener historial de pozos'
        });
    }
};

/**
 * GET /api/admin/pot-stats/:room
 * Obtiene estadísticas agregadas de pozos para gráficos
 */
exports.getPotStats = async (req, res) => {
    try {
        const { room } = req.params;
        const { days = 7 } = req.query;

        // Validar sala
        const validRooms = ['bronce', 'plata', 'oro'];
        if (!validRooms.includes(room)) {
            return res.status(400).json({
                success: false,
                error: 'Sala inválida'
            });
        }

        // Estadísticas por hora (para gráfico)
        const [hourlyStats] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
        AVG(jackpot_linea) as avg_linea,
        AVG(jackpot_bingo) as avg_bingo,
        AVG(jackpot_pre40) as avg_pre40,
        MAX(jackpot_linea) as max_linea,
        MAX(jackpot_bingo) as max_bingo,
        MAX(jackpot_pre40) as max_pre40,
        SUM(cards_added) as total_cards
      FROM pot_history
      WHERE room = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY hour
      ORDER BY hour ASC
    `, [room, parseInt(days)]);

        res.json({
            success: true,
            room,
            stats: hourlyStats
        });

    } catch (error) {
        console.error('[Admin] Error getting pot stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas'
        });
    }
};
