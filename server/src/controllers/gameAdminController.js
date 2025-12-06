/**
 * Controlador para administración de juegos automáticos
 */
const GameEngineAuto = require('../services/gameEngineAuto');

// Instancia global del motor (se inicializa en index.js)
let gameEngine = null;

exports.initGameEngine = (io) => {
  gameEngine = new GameEngineAuto(io);
  console.log('[GameAdmin] Motor de juego automático inicializado');
};

/**
 * POST /api/game-admin/start
 * Inicia un sorteo automático
 * Body: { gameSessionId, drawInterval?, pauseOnWinner? }
 */
exports.startAutoGame = async (req, res) => {
  try {
    const { gameSessionId, drawInterval, pauseOnWinner } = req.body;

    if (!gameSessionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'gameSessionId requerido' 
      });
    }

    if (!gameEngine) {
      return res.status(500).json({ 
        success: false, 
        message: 'Motor de juego no inicializado' 
      });
    }

    const gameState = await gameEngine.startGame(gameSessionId, {
      drawInterval: drawInterval || 5000,
      pauseOnWinner: pauseOnWinner || 2000
    });

    res.json({
      success: true,
      message: 'Sorteo automático iniciado',
      gameSessionId,
      roomId: gameState.roomId,
      ballsDrawn: gameState.ballsDrawn.length,
      availableBalls: gameState.availableBalls.length
    });

  } catch (error) {
    console.error('[GameAdmin] Error al iniciar juego:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * POST /api/game-admin/stop
 * Detiene un sorteo automático
 * Body: { gameSessionId }
 */
exports.stopAutoGame = async (req, res) => {
  try {
    const { gameSessionId } = req.body;

    if (!gameSessionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'gameSessionId requerido' 
      });
    }

    if (!gameEngine) {
      return res.status(500).json({ 
        success: false, 
        message: 'Motor de juego no inicializado' 
      });
    }

    gameEngine.stopGame(gameSessionId);

    res.json({
      success: true,
      message: 'Sorteo automático detenido',
      gameSessionId
    });

  } catch (error) {
    console.error('[GameAdmin] Error al detener juego:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * POST /api/game-admin/pause
 * Pausa/reanuda un sorteo
 * Body: { gameSessionId }
 */
exports.togglePause = async (req, res) => {
  try {
    const { gameSessionId } = req.body;

    if (!gameSessionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'gameSessionId requerido' 
      });
    }

    if (!gameEngine) {
      return res.status(500).json({ 
        success: false, 
        message: 'Motor de juego no inicializado' 
      });
    }

    const isPaused = gameEngine.togglePause(gameSessionId);

    res.json({
      success: true,
      message: isPaused ? 'Juego pausado' : 'Juego reanudado',
      gameSessionId,
      isPaused
    });

  } catch (error) {
    console.error('[GameAdmin] Error al pausar juego:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * GET /api/game-admin/status
 * Obtiene el estado de todos los juegos activos
 */
exports.getGamesStatus = async (req, res) => {
  try {
    if (!gameEngine) {
      return res.status(500).json({ 
        success: false, 
        message: 'Motor de juego no inicializado' 
      });
    }

    const activeGames = [];
    gameEngine.activeGames.forEach((state, sessionId) => {
      activeGames.push({
        sessionId,
        roomId: state.roomId,
        ballsDrawn: state.ballsDrawn.length,
        availableBalls: state.availableBalls.length,
        isPaused: state.isPaused,
        lineWinners: state.lineWinnersFound.size,
        bingoWinner: state.bingoWinner
      });
    });

    res.json({
      success: true,
      activeGames,
      totalGames: activeGames.length
    });

  } catch (error) {
    console.error('[GameAdmin] Error al obtener estado:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

module.exports = exports;
