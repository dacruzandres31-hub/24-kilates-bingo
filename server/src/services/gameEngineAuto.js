/**
 * Motor del juego - Controla el sorteo automático y validación de cartones
 * 
 * FLUJO AUTOMÁTICO (sin intervención del jugador):
 * 1. Sistema canta número cada X segundos
 * 2. Sistema marca automáticamente en TODOS los cartones
 * 3. Sistema valida automáticamente líneas y bingos
 * 4. Sistema anuncia ganadores con cartel a todos
 * 5. Pausa 1-2 segundos para celebrar
 * 6. Continúa sorteo hasta BINGO
 * 7. Al terminar → muestra formularios de pago
 */
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const {
  notifyLineWinner,
  notifyBingoWinner,
  showPaymentForms
} = require('../socket/winnerEvents');
const metricsService = require('./metricsService');
const sessionHistoryService = require('./sessionHistoryService');
const redis = require('../redis'); // NEW: Redis for persistent state

class GameEngineAuto {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map(); // Still used for local intervals, but state moves to Redis
    this.REDIS_PREFIX = 'game:state:';
  }

  // --- REDIS HELPERS ---
  _getRedisKey(sessionId) {
    return `${this.REDIS_PREFIX}${sessionId}`;
  }

  async saveGameStateToRedis(sessionId, state) {
    try {
      // Excluir el objeto de intervalo antes de guardar en Redis
      const stateToSave = { ...state };
      delete stateToSave.interval;

      await redis.set(this._getRedisKey(sessionId), JSON.stringify(stateToSave), 'EX', 7200); // 2 horas TTL
    } catch (error) {
      console.error(`[Redis] Error saving state for session ${sessionId}:`, error);
    }
  }

  async getGameStateFromRedis(sessionId) {
    try {
      const data = await redis.get(this._getRedisKey(sessionId));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`[Redis] Error getting state for session ${sessionId}:`, error);
      return null;
    }
  }

  async deleteGameStateFromRedis(sessionId) {
    try {
      await redis.del(this._getRedisKey(sessionId));
    } catch (error) {
      console.error(`[Redis] Error deleting state for session ${sessionId}:`, error);
    }
  }

  /**
   * Inicia un sorteo automático
   */
  async startGame(gameSessionId, options = {}) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`[GameEngine] 🚀 INICIANDO SORTEO - Session ${gameSessionId}`);
      console.log(`${'='.repeat(60)}`);

      const {
        drawInterval = 5000,      // 5 segundos entre números
        pauseOnWinner = 2000      // 2 segundos de pausa al cantar línea
      } = options;

      // Validar que Socket.IO está inicializado
      if (!this.io) {
        throw new Error('Socket.IO no está inicializado en gameEngine');
      }
      console.log(`[GameEngine] ✅ Socket.IO está inicializado`);
      console.log(`[GameEngine] 📊 Sockets conectados: ${this.io.engine.clientsCount || 0}`);

      const [sessions] = await pool.query(
        'SELECT * FROM game_sessions WHERE id = ? AND status IN (?, ?)',
        [gameSessionId, 'active', 'pending']
      );

      if (sessions.length === 0) {
        throw new Error('Sesión no encontrada o no está activa');
      }

      const session = sessions[0];
      console.log(`[GameEngine] ✅ Sesión encontrada: ${session.room}`);
      console.log(`[GameEngine] 🎯 Room de WebSocket: session_${gameSessionId}`);

      // LIMPIEZA Y REGENERACIÓN: Al iniciar sorteo
      // Eliminar cartones no usados y generar 1000 nuevos para próxima sesión
      const cardPoolManager = require('./cardPoolManager');
      cardPoolManager.cleanAndRegenerateForSession(session.room).catch(err => {
        console.error('[GameEngine] Error en limpieza/regeneración al iniciar:', err);
      });

      gameState.ballsDrawn = existingBalls.map(b => b.ball_number);
      gameState.availableBalls = gameState.availableBalls.filter(
        b => !gameState.ballsDrawn.includes(b)
      );

      // Guardar en Redis antes de iniciar
      await this.saveGameStateToRedis(gameSessionId, gameState);

      this.activeGames.set(gameSessionId, gameState);
      console.log(`[GameEngine] ✅ GameState creado y sincronizado con Redis`);

      // LIMPIAR bolas de sorteos anteriores si la sesión se está reiniciando
      await pool.query(
        'DELETE FROM game_session_balls WHERE game_session_id = ?',
        [gameSessionId]
      );
      console.log(`[GameEngine] 🧹 Bolas anteriores eliminadas para sesión ${gameSessionId}`);

      // Obtener números ya cantados (debería estar vacío después de la limpieza)
      const [existingBalls] = await pool.query(
        'SELECT ball_number FROM game_session_balls WHERE game_session_id = ? ORDER BY draw_order',
        [gameSessionId]
      );

      gameState.ballsDrawn = existingBalls.map(b => b.ball_number);
      gameState.availableBalls = gameState.availableBalls.filter(
        b => !gameState.ballsDrawn.includes(b)
      );

      // Cambiar estado de la sesión a 'playing' para indicar que está en sorteo
      await pool.query(
        'UPDATE game_sessions SET status = ? WHERE id = ?',
        ['playing', gameSessionId]
      );
      console.log(`[GameEngine] 📝 Sesión ${gameSessionId} cambiada a estado 'playing'`);

      // Iniciar sorteo automático
      this._startDrawInterval(gameSessionId, drawInterval, pauseOnWinner);

      console.log(`[GameEngine] 🎮 Juego ${gameSessionId} iniciado (sala: ${session.room})`);
      console.log(`[GameEngine] 📊 Estado inicial: ${gameState.ballsDrawn.length} bolas sorteadas, ${gameState.availableBalls.length} disponibles`);

      this.io.to(`session_${gameSessionId}`).emit('game_started', {
        gameSessionId,
        drawInterval,
        totalBalls: 90,
        pots: {
          bingo: session.jackpot_bingo,
          line: session.jackpot_linea,
          pre40: session.jackpot_pre40
        }
      });
      console.log(`[GameEngine] 📡 Evento 'game_started' emitido a session_${gameSessionId}`);

      return gameState;
    } catch (error) {
      console.error(`[GameEngine] ❌❌❌ ERROR CRÍTICO en startGame:`, error);
      console.error(`[GameEngine] ❌ Stack trace:`, error.stack);
      throw error;
    }
  }

  generateBallPool() {
    const balls = [];
    for (let i = 1; i <= 90; i++) {
      balls.push(i);
    }
    return balls;
  }

  /**
   * Método privado para iniciar el intervalo de sorteo
   */
  _startDrawInterval(gameSessionId, drawInterval, pauseOnWinner) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) return;

    if (gameState.interval) {
      clearInterval(gameState.interval);
    }

    console.log(`[GameEngine] ⏱️ Configurando intervalo de ${drawInterval}ms para sesión ${gameSessionId}`);
    gameState.interval = setInterval(async () => {
      // Fetch the latest state from Redis before each draw to ensure consistency
      const latestGameState = await this.getGameStateFromRedis(gameSessionId);
      if (!latestGameState || latestGameState.isPaused || latestGameState.bingoWinnersPaid) {
        // If paused, or game ended, or state not found, do nothing or clear interval
        if (latestGameState && latestGameState.bingoWinnersPaid) {
          console.log(`[GameEngine] Bingo already won for session ${gameSessionId}. Clearing interval.`);
          clearInterval(gameState.interval);
          gameState.interval = null;
          this.activeGames.delete(gameSessionId); // Remove from local active games
        }
        return;
      }
      // Update local gameState with latest from Redis for interval context
      Object.assign(gameState, latestGameState);

      try {
        await this.drawNextBall(gameSessionId, pauseOnWinner);
      } catch (error) {
        console.error(`[GameEngine] ❌ Error en sorteo ${gameSessionId}:`, error);
        try {
          fs.appendFileSync(
            path.join(__dirname, '../../critical_errors.txt'),
            `[${new Date().toISOString()}] CRASH in drawNextBall: ${error.message}\nSTACK: ${error.stack}\n\n`
          );
        } catch (logErr) { console.error('Error writing log:', logErr); }

        this.stopGame(gameSessionId);
      }
    }, drawInterval);
  }

  /**
   * Recupera sesiones que quedaron en estado 'playing' tras un reinicio
   */
  async resumeActiveSessions() {
    try {
      console.log('\n[GameEngine] 🔄 Buscando sesiones activas para recuperar...');
      const [playingSessions] = await pool.query(
        "SELECT * FROM game_sessions WHERE status = 'playing'"
      );

      if (playingSessions.length === 0) {
        console.log('[GameEngine] ℹ️ No hay sesiones activas para recuperar.');
        return;
      }

      for (const session of playingSessions) {
        const gameSessionId = session.id;
        console.log(`[GameEngine] 🛠️ Recuperando sesión ${gameSessionId} (${session.room})...`);

        // Try to get state from Redis first
        let gameState = await this.getGameStateFromRedis(gameSessionId);

        if (!gameState) {
          console.warn(`[GameEngine] ⚠️ No se encontró estado en Redis para sesión ${gameSessionId}. Reconstruyendo desde DB.`);
          // Obtener bolas ya sorteadas
          const [balls] = await pool.query(
            'SELECT ball_number, ball_letter FROM game_session_balls WHERE game_session_id = ? ORDER BY draw_order',
            [gameSessionId]
          );

          const ballsDrawn = balls.map(b => b.ball_number);

          // Verificar si la línea ya fue pagada revisando si hay alguien con line_won en validated_cards o card_pool
          const [lineWinners] = await pool.query(
            `SELECT COUNT(*) as count FROM game_winners WHERE game_session_id = ? AND prize_type = 'linea'`,
            [gameSessionId]
          );

          gameState = {
            sessionId: gameSessionId,
            roomId: session.room,
            ballsDrawn: ballsDrawn,
            lastBall: balls.length > 0 ? {
              number: balls[balls.length - 1].ball_number,
              letter: balls[balls.length - 1].ball_letter
            } : null,
            availableBalls: this.generateBallPool().filter(b => !ballsDrawn.includes(b)),
            interval: null,
            isPaused: false,
            lineWinnersPaid: lineWinners[0].count > 0,
            lineWinnersThisBall: [],
            bingoWinnersPaid: false, // Si estuviera pagado, la sesión no estaría en 'playing'
            bingoWinnersThisBall: []
          };
          await this.saveGameStateToRedis(gameSessionId, gameState); // Save reconstructed state to Redis
        } else {
          console.log(`[GameEngine] ✅ Estado de sesión ${gameSessionId} cargado desde Redis.`);
        }

        this.activeGames.set(gameSessionId, gameState);

        // Reiniciar el intervalo (usando valores por defecto si no están en la sesión)
        // Podríamos guardar el drawInterval en la BD para mayor precisión
        this._startDrawInterval(gameSessionId, 5000, 2000);

        console.log(`[GameEngine] ✅ Sesión ${gameSessionId} recuperada con ${gameState.ballsDrawn.length} bolas.`);
      }

    } catch (error) {
      console.error('[GameEngine] ❌ Error recuperando sesiones activas:', error);
    }
  }

  /**
   * Vigilante que asegura que las sesiones 'playing' en BD tengan motor activo
   */
  startWatchdog() {
    console.log('[GameEngine] 🛡️ Iniciando Watchdog de Sesiones...');
    setInterval(async () => {
      try {
        const [playingSessions] = await pool.query(
          "SELECT id FROM game_sessions WHERE status = 'playing'"
        );

        for (const session of playingSessions) {
          // Check if it's in local memory AND in Redis
          const localState = this.activeGames.get(session.id);
          const redisState = await this.getGameStateFromRedis(session.id);

          if (!localState || !redisState) {
            console.warn(`[GameEngine Watchdog] ⚠️ Sesión ${session.id} está en 'playing' pero el motor (local o Redis) está inactivo. Recuperando...`);
            // Recuperar esta sesión específica
            await this.resumeSpecificSession(session.id);
          }
        }
      } catch (error) {
        console.error('[GameEngine Watchdog] Error en ciclo:', error);
      }
    }, 60000); // Cada minuto
  }

  async resumeSpecificSession(gameSessionId) {
    try {
      const [sessions] = await pool.query('SELECT * FROM game_sessions WHERE id = ?', [gameSessionId]);
      if (sessions.length === 0) return;
      const session = sessions[0];

      let gameState = await this.getGameStateFromRedis(gameSessionId);

      if (!gameState) {
        console.warn(`[GameEngine] ⚠️ No se encontró estado en Redis para sesión ${gameSessionId} durante resumeSpecificSession. Reconstruyendo.`);
        const [balls] = await pool.query(
          'SELECT ball_number, ball_letter FROM game_session_balls WHERE game_session_id = ? ORDER BY draw_order',
          [gameSessionId]
        );
        const ballsDrawn = balls.map(b => b.ball_number);
        const [lineWinners] = await pool.query(
          `SELECT COUNT(*) as count FROM game_winners WHERE game_session_id = ? AND prize_type = 'linea'`,
          [gameSessionId]
        );

        gameState = {
          sessionId: gameSessionId,
          roomId: session.room,
          ballsDrawn: ballsDrawn,
          lastBall: balls.length > 0 ? {
            number: balls[balls.length - 1].ball_number,
            letter: balls[balls.length - 1].ball_letter
          } : null,
          availableBalls: this.generateBallPool().filter(b => !ballsDrawn.includes(b)),
          interval: null,
          isPaused: false,
          lineWinnersPaid: lineWinners[0].count > 0,
          lineWinnersThisBall: [],
          bingoWinnersPaid: false,
          bingoWinnersThisBall: []
        };
        await this.saveGameStateToRedis(gameSessionId, gameState);
      } else {
        console.log(`[GameEngine] ✅ Estado de sesión ${gameSessionId} cargado desde Redis para resumeSpecificSession.`);
      }

      this.activeGames.set(gameSessionId, gameState);
      this._startDrawInterval(gameSessionId, 5000, 2000);
      console.log(`[GameEngine] ✅ Sesión ${gameSessionId} recuperada.`);
    } catch (err) {
      console.error(`[GameEngine] Error recuperando sesión ${gameSessionId}:`, err);
    }
  }

  /**
   * Obtiene el estado actual de una sesión
   */
  async getGameState(sessionId) {
    // Intentar obtener de memoria local primero (por el objeto interval)
    let state = this.activeGames.get(sessionId);

    // Si no está en memoria (ej. tras reinicio), buscar en Redis
    if (!state) {
      state = await this.getGameStateFromRedis(sessionId);
      if (state) {
        // Restaurar en memoria local (sin el intervalo por ahora, 
        // el watchdog o resume lo iniciará si es necesario)
        this.activeGames.set(sessionId, state);
      }
    }

    if (!state) return null;

    return {
      gameSessionId: state.sessionId,
      ballsDrawn: state.ballsDrawn,
      lastBall: state.lastBall,
      drawOrder: state.ballsDrawn.length,
      isPaused: state.isPaused,
      lineWinnersPaid: state.lineWinnersPaid
    };
  }

  /**
   * Obtiene el estado de juego de una sala específica (útil para espectadores)
   */
  async getRoomGameState(roomName) {
    // Iterate through activeGames (which might have been populated from Redis by getGameState)
    for (const [sessionId, localState] of this.activeGames.entries()) {
      if (localState.roomId === roomName) {
        // Call getGameState to ensure we have the most up-to-date state, potentially from Redis
        const gameState = await this.getGameState(sessionId);
        if (gameState) {
          return gameState;
        }
      }
    }

    // If not found in local activeGames, try to find it in Redis directly
    // This is a fallback and might be less efficient if many sessions are in Redis
    const allRedisKeys = await redis.keys(`${this.REDIS_PREFIX}*`);
    for (const key of allRedisKeys) {
      const sessionId = key.replace(this.REDIS_PREFIX, '');
      const state = await this.getGameStateFromRedis(sessionId);
      if (state && state.roomId === roomName) {
        // If found, also add to local cache for future calls
        this.activeGames.set(sessionId, state);
        return {
          gameSessionId: state.sessionId,
          ballsDrawn: state.ballsDrawn,
          lastBall: state.lastBall,
          drawOrder: state.ballsDrawn.length,
          isPaused: state.isPaused,
          lineWinnersPaid: state.lineWinnersPaid
        };
      }
    }
    return null;
  }

  /**
   * Canta el siguiente número y valida TODOS los cartones automáticamente
   */
  async drawNextBall(gameSessionId, pauseOnWinner = 2000) {
    const gameState = await this.getGameState(gameSessionId); // Usar el nuevo getter async
    if (!gameState || gameState.availableBalls.length === 0 || gameState.isPaused) {
      // Si el bingo ya se cantó, detener el intervalo
      if (gameState && gameState.bingoWinnersPaid) {
        this.stopGame(gameSessionId);
      }
      return;
    }

    // Seleccionar bola aleatoria
    const randomIndex = Math.floor(Math.random() * gameState.availableBalls.length);
    const ballNumber = gameState.availableBalls[randomIndex];
    gameState.availableBalls.splice(randomIndex, 1);
    gameState.ballsDrawn.push(ballNumber);

    const ballLetter = this.getBallLetter(ballNumber);
    const drawOrder = gameState.ballsDrawn.length;

    // Actualizar estado de la última bola para sincronización
    gameState.lastBall = { number: ballNumber, letter: ballLetter };

    // --- PERSISTENCIA EN REDIS ---
    await this.saveGameStateToRedis(gameSessionId, gameState);

    try {
      await pool.query(
        `INSERT INTO game_session_balls (game_session_id, ball_number, ball_letter, draw_order)
         VALUES (?, ?, ?, ?)`,
        [gameSessionId, ballNumber, ballLetter, drawOrder]
      );
    } catch (dbErr) {
      console.error('[GameEngine] ❌ Error insertando bola:', dbErr);
      try {
        fs.appendFileSync(
          path.join(__dirname, '../../critical_errors.txt'),
          `[${new Date().toISOString()}] DB INSERT ERROR: ${dbErr.message}\nQuery: INSERT INTO game_session_balls... ${ballNumber}, ${drawOrder}\n\n`
        );
      } catch (e) { }
      throw dbErr; // Re-throw to trigger stopGame if critical
    }

    console.log(`\n[GameEngine] 🎱 BOLILLA SORTEADA: ${ballLetter}-${ballNumber} (#${drawOrder})`);

    // Emitir a todos los jugadores de esta sesión
    const sessionRoom = `session_${gameSessionId}`;
    const eventData = {
      gameSessionId,
      number: ballNumber, // Usar 'number' para coincidir con el frontend
      ballNumber,
      ballLetter,
      drawOrder,
      totalDrawn: gameState.ballsDrawn.length,
      room: gameState.roomId // Agregar info de sala
    };

    console.log(`[GameEngine] 📡 EMITIENDO 'ball_drawn' a room: ${sessionRoom}`);
    console.log(`[GameEngine] 📦 Datos del evento:`, JSON.stringify(eventData));

    // Verificar cuántos clientes están en el room de sesión
    const room = this.io.sockets.adapter.rooms.get(sessionRoom);
    const clientsInRoom = room ? room.size : 0;
    console.log(`[GameEngine] 👥 Clientes conectados en ${sessionRoom}: ${clientsInRoom}`);

    // EMISIÓN 1: A la sesión específica (participantes con cartones)
    this.io.to(sessionRoom).emit('ball_drawn', eventData);
    console.log(`[GameEngine] ✅ Evento 'ball_drawn' emitido a ${sessionRoom}`);

    // EMISIÓN 2: A la sala global (espectadores públicos)
    const globalRoom = `room_${gameState.roomId}`;
    const globalRoomClients = this.io.sockets.adapter.rooms.get(globalRoom);
    const spectators = globalRoomClients ? globalRoomClients.size : 0;

    this.io.to(globalRoom).emit('ball_drawn', eventData);
    console.log(`[GameEngine] 📺 Evento 'ball_drawn' emitido a ${globalRoom} (${spectators} espectadores)`);

    metricsService.increment('eventsEmitted');

    // ✅ NUEVO: Verificar TODOS los cartones (conectados y offline)
    try {
      await this.checkAllCardsForWinners(gameSessionId, ballNumber);
    } catch (offlineError) {
      console.error(`[GameEngine] ⚠️ Error en verificación offline (no fatal):`, offlineError);
    }

    /* 
    // VALIDAR AUTOMÁTICAMENTE TODOS LOS CARTONES (Desabilitado para flujo Tradicional - Se usa claimPrize)
    try {
      await this.validateAllCards(gameSessionId, pauseOnWinner);
    } catch (valError) {
      console.error(`[GameEngine] ⚠️ Error en validación de cartones (no fatal):`, valError);
    }

    // EMITIR REORDENAMIENTO DE CARTONES (para usuarios con múltiples cartones)
    await this.emitCardsReordering(gameSessionId);
    */
  }

  /**
   * Emite evento de reordenamiento de cartones a cada usuario
   */
  async emitCardsReordering(gameSessionId) {
    try {
      const CardAnalyzer = require('./cardAnalyzer');

      // Obtener todos los usuarios con cartones activos en esta sesión
      const [users] = await pool.query(
        `SELECT DISTINCT user_id FROM validated_cards 
         WHERE session_id = ?`,
        [gameSessionId]
      );

      // Para cada usuario, analizar sus cartones y emitir evento personal
      for (const { user_id } of users) {
        // Obtener cartones del usuario
        const [userCardsRaw] = await pool.query(
          `SELECT id, grid_numbers as numbers FROM validated_cards 
           WHERE user_id = ? AND session_id = ?
           ORDER BY id ASC`,
          [user_id, gameSessionId]
        );

        const userCards = userCardsRaw.map(c => ({
          ...c,
          numbers: typeof c.numbers === 'string' ? JSON.parse(c.numbers) : c.numbers
        }));

        if (userCards.length <= 1) continue; // Skip si tiene 1 o menos cartones

        // Obtener números cantados
        const gameState = await this.getGameState(gameSessionId); // Use async getter
        const calledNumbers = gameState ? gameState.ballsDrawn : [];

        // Analizar con CardAnalyzer
        const analysis = CardAnalyzer.analyzeUserCards(userCards, calledNumbers);
        const stackedCards = CardAnalyzer.generateStackedView(analysis.cards);

        // Emitir evento personal al usuario
        this.io.to(`user_${user_id}`).emit('cards_reordered', {
          gameSessionId,
          cards: stackedCards.map(c => ({
            cardId: c.cardId,
            score: c.score,
            progress: c.progress,
            markedCount: c.markedCount,
            viewConfig: c.viewConfig
          })),
          alerts: analysis.alerts,
          summary: {
            totalCards: analysis.totalCards,
            averageProgress: analysis.summary.averageProgress
          }
        });
      }
    } catch (error) {
      console.error('[GameEngine] Error emitiendo reordenamiento:', error);
      metricsService.recordError('GameEngine.emitCardsReordering', error);
    }
  }

  /**
   * Valida automáticamente todos los cartones activos
   * REGLAS NUEVAS:
   * - Solo LÍNEAS HORIZONTALES
   * - Solo se paga la PRIMERA línea de toda la partida
   * - Si múltiples cartones completan en la misma bolilla: SE DIVIDE el pozo
   * - BINGO: cartón completo (15/15), división si múltiples ganadores
   */
  async validateAllCards(gameSessionId, pauseOnWinner) {
    const gameState = await this.getGameState(gameSessionId); // Use async getter
    if (!gameState) return;

    const [cards] = await pool.query(
      `SELECT vc.id, vc.player_id as user_id, u.username, vc.grid_numbers as grid_data
       FROM validated_cards vc
       JOIN users u ON vc.player_id = u.id
       WHERE vc.game_session_id = ?`,
      [gameSessionId]
    );

    if (cards.length === 0) return;

    const calledNumbers = gameState.ballsDrawn;

    // Limpiar arrays de ganadores de esta bolilla
    gameState.lineWinnersThisBall = [];
    gameState.bingoWinnersThisBall = [];

    // FASE 1: Detectar todos los ganadores de LÍNEA en esta bolilla
    if (!gameState.lineWinnersPaid) {
      for (const card of cards) {
        const userId = card.user_id;
        const username = card.username;

        let cardNumbers;
        try {
          if (card.grid_data) {
            const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
            // Si viene de validated_cards (card_matrix), ya suele ser matriz 5x5
            // Si no, intentar convertir
            cardNumbers = Array.isArray(gridData[0]) ? gridData : this.convertGridDataToMatrix(gridData);
          } else {
            console.warn(`[GameEngine] ⚠️ Cartón ${card.id} sin grid_data`);
            continue;
          }
        } catch (parseErr) {
          console.error(`[GameEngine] ❌ Error parseando datos de cartón ${card.id}:`, parseErr);
          continue;
        }

        // Verificar si tiene alguna línea horizontal completa
        const lineResult = this.checkHorizontalLines(cardNumbers, calledNumbers);

        if (lineResult.hasLine) {
          gameState.lineWinnersThisBall.push({
            cardId: card.id,
            userId,
            username,
            lineType: lineResult.lineType,
            winningNumbers: lineResult.winningNumbers
          });
        }
      }

      // Si encontramos ganadores de línea, pagar
      if (gameState.lineWinnersThisBall.length > 0) {
        await this.payLineWinners(gameSessionId, gameState.lineWinnersThisBall);
        gameState.lineWinnersPaid = true;
        await this.saveGameStateToRedis(gameSessionId, gameState); // Save updated state

        // PAUSAR para celebrar
        gameState.isPaused = true;
        await this.saveGameStateToRedis(gameSessionId, gameState); // Save paused state
        setTimeout(async () => {
          gameState.isPaused = false;
          await this.saveGameStateToRedis(gameSessionId, gameState); // Save unpaused state
        }, pauseOnWinner);
      }
    }

    // FASE 2: Detectar todos los ganadores de BINGO en esta bolilla
    if (!gameState.bingoWinnersPaid) {
      for (const card of cards) {
        const userId = card.user_id;
        const username = card.username;

        let cardNumbers;
        try {
          if (card.numbers) {
            cardNumbers = typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;
          } else if (card.grid_data) {
            const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
            cardNumbers = this.convertGridDataToMatrix(gridData);
          } else {
            continue;
          }
        } catch (parseErr) {
          console.error(`[GameEngine] ❌ Error parseando datos de cartón ${card.id} (Bingo Check):`, parseErr);
          continue;
        }

        const bingoResult = this.validateBingo(cardNumbers, calledNumbers);

        if (bingoResult.isValid) {
          gameState.bingoWinnersThisBall.push({
            cardId: card.id,
            userId,
            username,
            winningNumbers: bingoResult.winningNumbers
          });
        }
      }

      // Si encontramos ganadores de BINGO, pagar y terminar
      if (gameState.bingoWinnersThisBall.length > 0) {
        await this.payBingoWinners(gameSessionId, gameState.bingoWinnersThisBall);
        gameState.bingoWinnersPaid = true;
        await this.saveGameStateToRedis(gameSessionId, gameState); // Save updated state
        await this.endGame(gameSessionId, 'completed');
      }
    }
  }

  /**
   * Verifica si el cartón tiene alguna línea HORIZONTAL completa
   * BINGO 90: 3 filas x 9 columnas, 15 números (5 per fila)
   */
  checkHorizontalLines(cardNumbers, calledNumbers) {
    if (!cardNumbers || !Array.isArray(cardNumbers)) return { hasLine: false };

    for (let r = 0; r < cardNumbers.length; r++) {
      const row = cardNumbers[r];
      const rowNumbers = row.filter(n => n !== null && n !== undefined && n !== 'FREE');

      if (rowNumbers.length === 0) continue;

      const isComplete = rowNumbers.every(num => calledNumbers.includes(num));

      if (isComplete) {
        return {
          hasLine: true,
          row: r,
          winningNumbers: rowNumbers
        };
      }
    }
    return { hasLine: false };
  }

  /**
   * Verifica si el cartón tiene BINGO completo (todos los números)
   */
  validateBingo(cardNumbers, calledNumbers) {
    if (!cardNumbers || !Array.isArray(cardNumbers)) {
      return { isValid: false, winningNumbers: [], totalMarked: 0 };
    }

    const allNumbers = cardNumbers.flat().filter(n => n !== null && n !== undefined && n !== 'FREE');
    if (allNumbers.length === 0) return { isValid: false, winningNumbers: [], totalMarked: 0 };

    const markedNumbers = allNumbers.filter(num => calledNumbers.includes(num));
    const isComplete = markedNumbers.length === allNumbers.length;

    return {
      isValid: isComplete,
      winningNumbers: allNumbers,
      totalMarked: markedNumbers.length,
      totalNeeded: allNumbers.length
    };
  }

  /**
   * Paga a los ganadores de línea (puede haber múltiples)
   */
  async payLineWinners(gameSessionId, winners) {
    const [session] = await pool.query('SELECT * FROM game_sessions WHERE id = ?', [gameSessionId]);
    const totalPrize = session[0].line_prize || 2500;
    const prizePerWinner = totalPrize / winners.length;

    const gameState = await this.getGameState(gameSessionId); // Use async getter

    console.log(`[GameEngine] 🎉 LÍNEA COMPLETADA - ${winners.length} ganador(es)`);

    for (const winner of winners) {
      await pool.query(
        `INSERT INTO game_winners 
         (game_session_id, user_id, card_id, prize_type, prize_amount, line_type, winning_numbers, verified)
         VALUES (?, ?, ?, 'linea', ?, ?, ?, TRUE)`,
        [gameSessionId, winner.userId, winner.cardId, prizePerWinner, winner.lineType, JSON.stringify(winner.winningNumbers)]
      );

      console.log(`   → ${winner.username}: $${prizePerWinner.toFixed(2)} (${winner.lineType})`);

      // Obtener datos completos del cartón ganador
      const [cardRows] = await pool.query(
        'SELECT numbers, grid_data FROM bingo_cards_pool WHERE id = ?',
        [winner.cardId]
      );

      let cardNumbers = null;
      if (cardRows.length > 0) {
        const card = cardRows[0];
        if (card.numbers) {
          cardNumbers = typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;
        } else if (card.grid_data) {
          const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
          cardNumbers = this.convertGridDataToMatrix(gridData);
        }
      }

      notifyLineWinner(
        this.io,
        `session_${gameSessionId}`,
        { id: winner.userId, username: winner.username },
        prizePerWinner,
        winner.lineType,
        cardNumbers ? {
          numbers: cardNumbers,
          winningNumbers: winner.winningNumbers
        } : null
      );
    }

    if (winners.length > 1) {
      console.log(`   💰 Pozo dividido: $${totalPrize} / ${winners.length} = $${prizePerWinner.toFixed(2)} c/u`);
    }
  }

  /**
   * Paga a los ganadores de BINGO (puede haber múltiples)
   */
  async payBingoWinners(gameSessionId, winners) {
    const [session] = await pool.query('SELECT * FROM game_sessions WHERE id = ?', [gameSessionId]);
    const totalPrize = session[0].bingo_prize || 25000;
    const prizePerWinner = totalPrize / winners.length;

    const gameState = await this.getGameState(gameSessionId); // Use async getter

    console.log(`[GameEngine] 🎊 BINGO COMPLETADO - ${winners.length} ganador(es)`);

    for (const winner of winners) {
      await pool.query(
        `INSERT INTO game_winners 
         (game_session_id, user_id, card_id, prize_type, prize_amount, winning_numbers, verified)
         VALUES (?, ?, ?, 'bingo', ?, ?, TRUE)`,
        [gameSessionId, winner.userId, winner.cardId, prizePerWinner, JSON.stringify(winner.winningNumbers)]
      );

      console.log(`   → ${winner.username}: $${prizePerWinner.toFixed(2)}`);

      notifyBingoWinner(
        this.io,
        `session_${gameSessionId}`,
        { id: winner.userId, username: winner.username },
        prizePerWinner,
        gameSessionId
      );
    }

    if (winners.length > 1) {
      console.log(`   💰 Pozo dividido: $${totalPrize} / ${winners.length} = $${prizePerWinner.toFixed(2)} c/u`);
    }
  }

  /**
   * Termina el juego y muestra formularios de pago
   */
  async endGame(gameSessionId, status = 'completed') {
    const gameState = await this.getGameState(gameSessionId);
    if (!gameState) return;

    console.log(`[GameEngine] 🏁 FINALIZANDO JUEGO ${gameSessionId}...`);

    try {
      if (gameState.interval) {
        clearInterval(gameState.interval);
      }

      this.activeGames.delete(gameSessionId);
      await this.deleteGameStateFromRedis(gameSessionId); // NEW: Limpiar Redis
    } catch (error) {
      console.error(`[GameEngine] Error al limpiar estado del juego ${gameSessionId}:`, error);
    }

    // PERSISTIR RESULTADOS EN game_sessions antes de archivar
    const ballSequence = gameState.ballsDrawn;
    const [winners] = await pool.query(
      'SELECT user_id, prize_type, prize_amount, ball_number FROM game_winners WHERE game_session_id = ?',
      [gameSessionId]
    );

    const lineaWinner = winners.find(w => w.prize_type === 'linea');
    const bingoWinner = winners.find(w => (w.prize_type === 'bingo' || w.prize_type === 'bingo_pre40'));

    const lineaBallNumber = lineaWinner ? lineaWinner.ball_number : null;
    const lineaBallIndex = lineaBallNumber !== null ? ballSequence.indexOf(lineaBallNumber) : null;

    const bingoBallNumber = bingoWinner ? bingoWinner.ball_number : null;
    const bingoBallIndex = bingoBallNumber !== null ? ballSequence.indexOf(bingoBallNumber) : null;

    await pool.query(
      `UPDATE game_sessions SET 
        status = ?, 
        ball_sequence = ?,
        linea_ball_number = ?,
        linea_ball_index = ?,
        bingo_ball_number = ?,
        bingo_ball_index = ?,
        updated_at = NOW() 
       WHERE id = ?`,
      [
        status,
        JSON.stringify(ballSequence),
        lineaBallNumber,
        lineaBallIndex,
        bingoBallNumber,
        bingoBallIndex,
        gameSessionId
      ]
    );

    // NUEVO: Marcar cartones de la sesión como JUGADOS (Historial)
    await pool.query(
      `UPDATE bingo_cards SET status = 'played' WHERE session_id = ?`,
      [gameSessionId]
    );
    console.log(`[GameEngine] 📜 Cartones de sesión ${gameSessionId} marcados como 'played' (Historial)`);

    // LIMPIEZA: Eliminar cartones no asignados a ninguna sesión de esta sala
    // Esto se ejecuta cuando finaliza cada sorteo
    if (gameState.room) {
      const [cleanupResult] = await pool.query(`
        DELETE FROM bingo_cards_pool 
        WHERE room = ? 
        AND status = 'selected' 
        AND game_session_id IS NULL
      `, [gameState.room]);

      console.log(`[GameEngine] 🧹 Limpieza post-sorteo sala ${gameState.room}: ${cleanupResult.affectedRows} cartones huérfanos eliminados`);
    }

    console.log(`[GameEngine] 🏁 Juego ${gameSessionId} terminado`);

    this.io.to(`session_${gameSessionId}`).emit('game_ended', {
      gameSessionId,
      status,
      totalBallsDrawn: gameState.ballsDrawn.length
    });

    // ARCHIVAR SESIÓN AUTOMÁTICAMENTE
    try {
      await sessionHistoryService.archiveSession(gameSessionId);
      console.log(`[GameEngine] ✅ Sesión ${gameSessionId} archivada exitosamente.`);
    } catch (archiveError) {
      console.error(`[GameEngine] ❌ Error archivando sesión ${gameSessionId}:`, archiveError);
    }

    // Formularios de pago después de 5 segundos
    setTimeout(async () => {
      const winners = await this.getGameWinners(gameSessionId);
      if (winners.length > 0) {
        showPaymentForms(this.io, gameSessionId, winners);
      }
    }, 5000);

    this.activeGames.delete(gameSessionId);
  }

  stopGame(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) return;

    if (gameState.interval) {
      clearInterval(gameState.interval);
      gameState.interval = null;
    }

    // Volver estado a 'pending' para permitir compra de cartones nuevamente
    pool.query(
      'UPDATE game_sessions SET status = ? WHERE id = ?',
      ['pending', gameSessionId]
    ).then(() => {
      console.log(`[GameEngine] 📝 Sesión ${gameSessionId} cambiada a estado 'pending'`);
    }).catch(err => {
      console.error(`[GameEngine] Error actualizando estado de sesión ${gameSessionId}:`, err);
    });

    console.log(`[GameEngine] 🛑 Juego ${gameSessionId} detenido`);
    this.activeGames.delete(gameSessionId);
  }

  togglePause(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) return false;

    gameState.isPaused = !gameState.isPaused;
    console.log(`[GameEngine] ${gameState.isPaused ? '⏸️ Pausado' : '▶️ Reanudado'}`);
    return gameState.isPaused;
  }

  // ===== FUNCIONES DE VALIDACIÓN =====

  getBallLetter(number) {
    if (number >= 1 && number <= 18) return 'B';
    if (number >= 19 && number <= 36) return 'I';
    if (number >= 37 && number <= 54) return 'N';
    if (number >= 55 && number <= 72) return 'G';
    if (number >= 73 && number <= 90) return 'O';
    return '?';
  }

  validateLine(cardNumbers, calledNumbers, lineType) {
    const positions = this.getLinePositions(lineType);
    const winningNumbers = [];
    const missingNumbers = [];

    for (const [row, col] of positions) {
      const number = cardNumbers[row][col];

      if (row === 2 && col === 2) {
        winningNumbers.push('FREE');
        continue;
      }

      if (calledNumbers.includes(number)) {
        winningNumbers.push(number);
      } else {
        missingNumbers.push(number);
      }
    }

    return {
      isValid: missingNumbers.length === 0,
      winningNumbers,
      missingNumbers
    };
  }



  getLinePositions(lineType) {
    switch (lineType) {
      case 'horizontal_1': return [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
      case 'horizontal_2': return [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]];
      case 'horizontal_3': return [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]];
      case 'horizontal_4': return [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]];
      case 'horizontal_5': return [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]];
      case 'vertical_1': return [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]];
      case 'vertical_2': return [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]];
      case 'vertical_3': return [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]];
      case 'vertical_4': return [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]];
      case 'vertical_5': return [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]];
      case 'diagonal_1': return [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
      case 'diagonal_2': return [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]];
      case 'four_corners': return [[0, 0], [0, 4], [4, 0], [4, 4]];
      default: return [];
    }
  }

  convertGridDataToMatrix(gridData) {
    // Si ya es una matriz 3x9 o 5x5
    if (Array.isArray(gridData) && gridData.length > 0 && Array.isArray(gridData[0])) {
      return gridData;
    }

    // Caso Bingo 90 (3x9) almacenado como objeto con filas
    if (typeof gridData === 'object' && gridData.rows) {
      return gridData.rows;
    }

    // Caso Bingo 75 (B,I,N,G,O object)
    if (typeof gridData === 'object' && gridData.B && gridData.I && gridData.N && gridData.G && gridData.O) {
      const matrix = [];
      const rowCount = Array.isArray(gridData.B) ? gridData.B.length : 5;
      for (let row = 0; row < rowCount; row++) {
        matrix.push([
          gridData.B[row],
          gridData.I[row],
          gridData.N[row],
          gridData.G[row],
          gridData.O[row]
        ]);
      }
      return matrix;
    }

    // Caso Array plano de 25 (Bingo 75)
    if (Array.isArray(gridData) && gridData.length === 25) {
      const matrix = [];
      for (let i = 0; i < 5; i++) {
        matrix.push(gridData.slice(i * 5, (i + 1) * 5));
      }
      return matrix;
    }

    // Caso Array plano de 27 (Bingo 90: 3x9)
    if (Array.isArray(gridData) && gridData.length === 27) {
      const matrix = [];
      for (let i = 0; i < 3; i++) {
        matrix.push(gridData.slice(i * 9, (i + 1) * 9));
      }
      return matrix;
    }

    return [];
  }

  async getGameWinners(gameSessionId) {
    const [winners] = await pool.query(
      `SELECT gw.user_id, u.username, gw.prize_type, gw.prize_amount
       FROM game_winners gw
       JOIN users u ON gw.user_id = u.id
       WHERE gw.game_session_id = ?
       ORDER BY gw.claimed_at`,
      [gameSessionId]
    );

    const grouped = {};
    winners.forEach(w => {
      if (!grouped[w.user_id]) {
        grouped[w.user_id] = {
          userId: w.user_id,
          username: w.username,
          prizes: []
        };
      }
      grouped[w.user_id].prizes.push({
        type: w.prize_type,
        amount: parseFloat(w.prize_amount)
      });
    });

    return Object.values(grouped);
  }

  /**
   * Pausar el sorteo automático (SuperAdmin only)
   */
  pauseGame(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) {
      throw new Error('Juego no encontrado');
    }

    if (gameState.isPaused) {
      throw new Error('El juego ya está pausado');
    }

    gameState.isPaused = true;
    console.log(`[GameEngine] ⏸️ Juego ${gameSessionId} pausado`);

    // Notificar a todos los jugadores
    this.io.to(`session_${gameSessionId}`).emit('game_paused', {
      gameSessionId,
      message: 'El sorteo ha sido pausado temporalmente'
    });

    return { success: true, message: 'Juego pausado' };
  }

  /**
   * Reanudar el sorteo automático (SuperAdmin only)
   */
  resumeGame(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) {
      throw new Error('Juego no encontrado');
    }

    if (!gameState.isPaused) {
      throw new Error('El juego no está pausado');
    }

    gameState.isPaused = false;
    console.log(`[GameEngine] ▶️ Juego ${gameSessionId} reanudado`);

    // Notificar a todos los jugadores
    this.io.to(`session_${gameSessionId}`).emit('game_resumed', {
      gameSessionId,
      message: 'El sorteo ha sido reanudado'
    });

    return { success: true, message: 'Juego reanudado' };
  }

  /**
   * ========================================
   * MÉTODOS DE VERIFICACIÓN OFFLINE
   * ========================================
   */

  /**
   * Verifica TODOS los cartones de la sesión (conectados y offline)
   * Se ejecuta después de cada bolilla salida
   */
  async checkAllCardsForWinners(gameSessionId, currentBall) {
    try {
      const gameState = this.activeGames.get(gameSessionId);
      if (!gameState) return;

      // 1. Verificar si la LÍNEA ya fue ganada en bolillas anteriores
      // Revisamos en ambas tablas
      const [lineInPaid] = await pool.query(`SELECT COUNT(*) as count FROM validated_cards WHERE game_session_id = ? AND line_won = TRUE AND line_ball_number < ?`, [gameSessionId, currentBall]);
      const [lineInStarter] = await pool.query(`SELECT COUNT(*) as count FROM card_pool WHERE session_id = ? AND line_won = TRUE AND line_ball_number < ?`, [gameSessionId, currentBall]);

      const lineAlreadyWon = (lineInPaid[0].count + lineInStarter[0].count) > 0;

      // 2. Obtener cartones de SALAS PAGAS
      const [paidCards] = await pool.query(`
        SELECT id as card_id, player_id as user_id, grid_numbers as card_data, line_won, bingo_won, 'paga' as room_type
        FROM validated_cards
        WHERE game_session_id = ?
      `, [gameSessionId]);

      // 3. Obtener cartones de SALA STARTER
      const [starterCards] = await pool.query(`
        SELECT id as card_id, reserved_by as user_id, numbers as card_data, line_won, bingo_won, 'starter' as room_type
        FROM card_pool
        WHERE session_id = ? AND reserved_by IS NOT NULL
      `, [gameSessionId]);

      const allCards = [...paidCards, ...starterCards];
      if (allCards.length === 0) return;

      const newLineWinners = [];
      const newBingoWinners = [];

      // 4. Evaluar cada cartón
      for (const card of allCards) {
        try {
          const cardData = typeof card.card_data === 'string' ? JSON.parse(card.card_data) : card.card_data;
          const cardNumbers = this.convertGridDataToMatrix(cardData);

          // Evaluar LÍNEA
          if (!lineAlreadyWon && !card.line_won) {
            const lineResult = this.checkHorizontalLines(cardNumbers, gameState.ballsDrawn);
            if (lineResult.hasLine) {
              newLineWinners.push({ ...card, cardData });
            }
          }

          // Evaluar BINGO
          if (!card.bingo_won) {
            const bingoResult = this.validateBingo(cardNumbers, gameState.ballsDrawn);
            if (bingoResult.isValid) {
              console.log(`🎯 [OfflineWinners] BINGO DETECTADO para cartón ${card.card_id}`);
              newBingoWinners.push({ ...card, cardData });
            }
          }
        } catch (err) {
          console.error(`❌ [OfflineWinners] Error procesando cartón ${card.card_id}:`, err);
        }
      }

      // 5. Registrar ganadores
      if (newLineWinners.length > 0) {
        await this.registerLineWinners(gameSessionId, newLineWinners, currentBall);
      }

      if (newBingoWinners.length > 0) {
        await this.registerBingoWinners(gameSessionId, newBingoWinners, currentBall);
      }

    } catch (error) {
      console.error('❌ [OfflineWinners] Error en verificación general:', error);
    }
  }

  /**
   * Registra múltiples ganadores de LÍNEA en la misma bolilla
   */
  async registerLineWinners(gameSessionId, winners, ballNumber) {
    try {
      const gameState = this.activeGames.get(gameSessionId);
      const shareCount = winners.length;

      // Obtener pozo actual
      const [session] = await pool.query(`SELECT jackpot_linea, room FROM game_sessions WHERE id = ?`, [gameSessionId]);
      const totalPrize = parseFloat(session[0].jackpot_linea) || 0;
      const individualPrize = totalPrize / shareCount;

      console.log(`🎉 [OfflineWinners] ${shareCount} GANADORES DE LÍNEA en bolilla ${ballNumber}. Pozo: $${totalPrize} -> $${individualPrize} c/u`);

      for (const winner of winners) {
        // Obtener nombre de usuario y tier
        const [u] = await pool.query(`
          SELECT u.username, m.name as tier_name
          FROM users u
          LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
          LEFT JOIN memberships m ON us.membership_id = m.id
          WHERE u.id = ?
        `, [winner.user_id]);

        const username = u[0]?.username || 'Usuario';
        const tier = u[0]?.tier_name || null;

        // Marcar cartón en la tabla correspondiente
        if (winner.room_type === 'paga') {
          await pool.query(`UPDATE validated_cards SET line_won = TRUE, line_ball_number = ? WHERE id = ?`, [ballNumber, winner.card_id]);
        } else {
          await pool.query(`UPDATE card_pool SET line_won = TRUE, line_ball_number = ? WHERE id = ?`, [ballNumber, winner.card_id]);
        }

        // Acreditar balance
        await pool.query(`UPDATE users SET balance = balance + ? WHERE id = ?`, [individualPrize, winner.user_id]);

        // Registrar en historial con card_data
        await pool.query(`
          INSERT INTO game_winners 
          (game_session_id, user_id, card_id, card_data, prize_type, ball_number, balls_drawn, prize_amount, share_count, balance_credited)
          VALUES (?, ?, ?, ?, 'linea', ?, ?, ?, ?, TRUE)
        `, [gameSessionId, winner.user_id, winner.card_id, JSON.stringify(winner.cardData), ballNumber, JSON.stringify(gameState.ballsDrawn), individualPrize, shareCount]);

        // Notificar via Socket
        const eventData = {
          userId: winner.user_id,
          username,
          tier, // Nuevo: Incluir tier del ganador
          cardId: winner.card_id,
          ballNumber,
          prize: individualPrize,
          shareCount,
          timestamp: new Date()
        };
        this.io.to(`session_${gameSessionId}`).emit('line_winner', eventData);
        this.io.to(`room_${gameState.roomId}`).emit('line_winner', eventData);
      }

      // Resetear pozo de línea en la sesión
      await pool.query(`UPDATE game_sessions SET jackpot_linea = 0 WHERE id = ?`, [gameSessionId]);

    } catch (error) {
      console.error('❌ [OfflineWinners] Error registrando ganadores de línea:', error);
    }
  }

  /**
   * Registra múltiples ganadores de BINGO en la misma bolilla
   */
  async registerBingoWinners(gameSessionId, winners, ballNumber) {
    try {
      const gameState = this.activeGames.get(gameSessionId);
      const shareCount = winners.length;

      // Obtener pozo actual
      const [session] = await pool.query(`SELECT jackpot_bingo, jackpot_pre40, room FROM game_sessions WHERE id = ?`, [gameSessionId]);
      const baseBingoPrize = parseFloat(session[0].jackpot_bingo) || 0;

      // Verificar JackPot Pre-40
      let totalBingoPrize = baseBingoPrize;
      let pre40Won = false;
      if (ballNumber <= 40) {
        const pre40Prize = parseFloat(session[0].jackpot_pre40) || 0;
        if (pre40Prize > 0) {
          totalBingoPrize += pre40Prize;
          pre40Won = true;
          console.log(`🔥 [OfflineWinners] ¡JACKPOT PRE-40 GANADO! (Bolilla ${ballNumber}) Extra: $${pre40Prize}`);
        }
      }

      const individualPrize = totalBingoPrize / shareCount;

      console.log(`🏆 [OfflineWinners] ${shareCount} GANADORES DE BINGO en bolilla ${ballNumber}. Premio Total: $${totalBingoPrize} -> $${individualPrize} c/u`);

      for (const winner of winners) {
        // Obtener nombre de usuario y tier
        const [u] = await pool.query(`
          SELECT u.username, m.name as tier_name
          FROM users u
          LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
          LEFT JOIN memberships m ON us.membership_id = m.id
          WHERE u.id = ?
        `, [winner.user_id]);

        const username = u[0]?.username || 'Usuario';
        const tier = u[0]?.tier_name || null;

        // Marcar cartón en la tabla correspondiente
        if (winner.room_type === 'paga') {
          await pool.query(`UPDATE validated_cards SET bingo_won = TRUE, bingo_ball_number = ? WHERE id = ?`, [ballNumber, winner.card_id]);
        } else {
          await pool.query(`UPDATE card_pool SET bingo_won = TRUE, bingo_ball_number = ? WHERE id = ?`, [ballNumber, winner.card_id]);
        }

        // Acreditar balance
        await pool.query(`UPDATE users SET balance = balance + ? WHERE id = ?`, [individualPrize, winner.user_id]);

        // Registrar en historial con card_data
        await pool.query(`
          INSERT INTO game_winners 
          (game_session_id, user_id, card_id, card_data, prize_type, ball_number, balls_drawn, prize_amount, share_count, balance_credited)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `, [gameSessionId, winner.user_id, winner.card_id, JSON.stringify(winner.cardData), pre40Won ? 'bingo_pre40' : 'bingo', ballNumber, JSON.stringify(gameState.ballsDrawn), individualPrize, shareCount]);

        // Notificar via Socket
        const eventData = {
          userId: winner.user_id,
          username,
          tier, // Nuevo: Incluir tier del ganador
          cardId: winner.card_id,
          ballNumber,
          prize: individualPrize,
          shareCount,
          isPre40: pre40Won,
          timestamp: new Date()
        };
        this.io.to(`session_${gameSessionId}`).emit('bingo_winner', eventData);
        this.io.to(`room_${gameState.roomId}`).emit('bingo_winner', eventData);
      }

      // Resetear pozos
      if (pre40Won) {
        await pool.query(`UPDATE game_sessions SET jackpot_bingo = 0, jackpot_pre40 = 0 WHERE id = ?`, [gameSessionId]);
        await pool.query(`UPDATE room_settings SET accumulated_pot_pre40 = 0 WHERE room = ?`, [session[0].room]);
      } else {
        await pool.query(`UPDATE game_sessions SET jackpot_bingo = 0 WHERE id = ?`, [gameSessionId]);
      }

      // TERMINAR EL JUEGO
      console.log(`🏁 [OfflineWinners] Finalizando sesión ${gameSessionId} por Bingo`);
      await this.endGame(gameSessionId, 'completed');

    } catch (error) {
      console.error('❌ [OfflineWinners] Error registrando ganadores de bingo:', error);
    }
  }
}

module.exports = GameEngineAuto;
