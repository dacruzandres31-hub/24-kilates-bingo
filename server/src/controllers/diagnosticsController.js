const pool = require('../db');

/**
 * GET /api/admin/socket-diagnostics
 * Retorna información de diagnóstico de WebSockets
 */
exports.getSocketDiagnostics = async (req, res) => {
    try {
        const gameAdminController = require('./gameAdminController');
        const gameEngine = gameAdminController.gameEngine;

        if (!gameEngine) {
            return res.json({
                success: false,
                message: 'Game engine not initialized',
                activeGames: 0,
                games: []
            });
        }

        // Obtener información de juegos activos
        const activeGames = [];
        for (const [sessionId, gameState] of gameEngine.activeGames.entries()) {
            activeGames.push({
                sessionId,
                ballsDrawn: gameState.ballsDrawn.length,
                availableBalls: gameState.availableBalls.length,
                isPaused: gameState.isPaused || false,
                roomId: gameState.roomId
            });
        }

        // Obtener información de sesiones en BD
        const [sessions] = await pool.query(`
      SELECT 
        id,
        room,
        status,
        start_time,
        (SELECT COUNT(*) FROM game_session_balls WHERE game_session_id = game_sessions.id) as balls_drawn
      FROM game_sessions
      WHERE status IN ('active', 'playing')
      ORDER BY start_time DESC
      LIMIT 10
    `);

        // Obtener estadísticas de Socket.IO
        const io = req.app.get('io');
        const socketStats = {
            connectedSockets: io.engine.clientsCount || 0,
            rooms: []
        };

        // Listar rooms activos
        if (io.sockets.adapter && io.sockets.adapter.rooms) {
            for (const [roomName, sockets] of io.sockets.adapter.rooms.entries()) {
                // Solo mostrar rooms de sesión
                if (roomName.startsWith('session_')) {
                    socketStats.rooms.push({
                        name: roomName,
                        clients: sockets.size
                    });
                }
            }
        }

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            gameEngine: {
                initialized: !!gameEngine,
                activeGames: activeGames.length,
                games: activeGames
            },
            database: {
                activeSessions: sessions.length,
                sessions: sessions
            },
            sockets: socketStats
        });

    } catch (error) {
        console.error('[SocketDiagnostics] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/admin/live-sessions
 * Retorna información de sesiones activas para monitoreo en vivo
 */
exports.getLiveSessions = async (req, res) => {
    try {
        const [sessions] = await pool.query(`
      SELECT 
        gs.id,
        gs.room,
        gs.status,
        gs.start_time,
        gs.jackpot_bingo,
        gs.jackpot_linea,
        gs.jackpot_pre40,
        (SELECT COUNT(*) FROM game_session_balls WHERE game_session_id = gs.id) as balls_drawn,
        (SELECT COUNT(DISTINCT buyer_id) FROM daily_stock_cards WHERE room = gs.room AND status = 'sold') as players_count
      FROM game_sessions gs
      WHERE gs.status IN ('active', 'playing')
      ORDER BY gs.start_time DESC
    `);

        // Obtener últimas 5 bolillas de cada sesión
        for (const session of sessions) {
            const [balls] = await pool.query(`
        SELECT ball_number, ball_letter, draw_order
        FROM game_session_balls
        WHERE game_session_id = ?
        ORDER BY draw_order DESC
        LIMIT 5
      `, [session.id]);

            session.recentBalls = balls.reverse(); // Mostrar en orden cronológico
        }

        res.json({
            success: true,
            sessions
        });

    } catch (error) {
        console.error('[LiveSessions] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/game/session-status/:sessionId
 * Retorna el estado actual de una sesión específica
 */
exports.getSessionStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const [sessions] = await pool.query(`
      SELECT 
        id,
        room,
        status,
        start_time,
        jackpot_bingo,
        jackpot_linea,
        jackpot_pre40
      FROM game_sessions
      WHERE id = ?
    `, [sessionId]);

        if (sessions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        const session = sessions[0];

        // Obtener bolillas sorteadas
        const [balls] = await pool.query(`
      SELECT ball_number, ball_letter, draw_order
      FROM game_session_balls
      WHERE game_session_id = ?
      ORDER BY draw_order ASC
    `, [sessionId]);

        // Verificar si está en memoria (activo en gameEngine)
        const gameAdminController = require('./gameAdminController');
        const gameEngine = gameAdminController.gameEngine;
        const isInMemory = gameEngine && gameEngine.activeGames.has(parseInt(sessionId));

        // Obtener info de Socket.IO
        const io = req.app.get('io');
        const sessionRoom = `session_${sessionId}`;
        let connectedClients = 0;

        if (io.sockets.adapter && io.sockets.adapter.rooms) {
            const room = io.sockets.adapter.rooms.get(sessionRoom);
            connectedClients = room ? room.size : 0;
        }

        res.json({
            success: true,
            session: {
                ...session,
                ballsDrawn: balls.length,
                balls: balls,
                isActive: isInMemory,
                connectedPlayers: connectedClients
            }
        });

    } catch (error) {
        console.error('[SessionStatus] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
