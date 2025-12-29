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

class GameEngineAuto {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map(); // gameSessionId -> gameState
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

      // Estado del juego
      const gameState = {
        sessionId: gameSessionId,
        roomId: session.room,
        ballsDrawn: [],
        availableBalls: this.generateBallPool(),
        interval: null,
        isPaused: false,
        lineWinnersPaid: false,           // Solo se paga UNA VEZ la primera línea
        lineWinnersThisBall: [],          // Ganadores de línea en esta bolilla
        bingoWinnersPaid: false,          // Control de BINGO pagado
        bingoWinnersThisBall: []          // Ganadores de BINGO en esta bolilla
      };

      this.activeGames.set(gameSessionId, gameState);
      console.log(`[GameEngine] ✅ GameState creado y guardado`);

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
      console.log(`[GameEngine] ⏱️ Configurando intervalo de ${drawInterval}ms para sesión ${gameSessionId}`);
      gameState.interval = setInterval(async () => {
        console.log(`[GameEngine] 🔄 Intervalo ejecutándose para sesión ${gameSessionId}, isPaused: ${gameState.isPaused}`);
        if (gameState.isPaused) return;

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
   * Canta el siguiente número y valida TODOS los cartones automáticamente
   */
  async drawNextBall(gameSessionId, pauseOnWinner = 2000) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) throw new Error('Juego no encontrado');

    if (gameState.availableBalls.length === 0) {
      console.log(`[GameEngine] Juego ${gameSessionId} terminado - no hay más bolas`);
      await this.endGame(gameSessionId, 'completed');
      return;
    }

    // Seleccionar bola aleatoria
    const randomIndex = Math.floor(Math.random() * gameState.availableBalls.length);
    const ballNumber = gameState.availableBalls[randomIndex];
    gameState.availableBalls.splice(randomIndex, 1);
    gameState.ballsDrawn.push(ballNumber);

    const ballLetter = this.getBallLetter(ballNumber);
    const drawOrder = gameState.ballsDrawn.length;

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

    console.log(`[GameEngine] 📡 EMITIENDO 'number_drawn' a room: ${sessionRoom}`);
    console.log(`[GameEngine] 📦 Datos del evento:`, JSON.stringify(eventData));

    // Verificar cuántos clientes están en el room de sesión
    const room = this.io.sockets.adapter.rooms.get(sessionRoom);
    const clientsInRoom = room ? room.size : 0;
    console.log(`[GameEngine] 👥 Clientes conectados en ${sessionRoom}: ${clientsInRoom}`);

    // EMISIÓN 1: A la sesión específica (participantes con cartones)
    this.io.to(sessionRoom).emit('number_drawn', eventData);
    console.log(`[GameEngine] ✅ Evento 'number_drawn' emitido a ${sessionRoom}`);

    // EMISIÓN 2: A la sala global (espectadores públicos)
    const globalRoom = `room_${gameState.roomId}`;
    const globalRoomClients = this.io.sockets.adapter.rooms.get(globalRoom);
    const spectators = globalRoomClients ? globalRoomClients.size : 0;

    this.io.to(globalRoom).emit('number_drawn', eventData);
    console.log(`[GameEngine] 📺 Evento 'number_drawn' emitido a ${globalRoom} (${spectators} espectadores)`);

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
        const gameState = this.activeGames.get(gameSessionId);
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
   * - BINGO: cartón completo (25/25), división si múltiples ganadores
   */
  async validateAllCards(gameSessionId, pauseOnWinner) {
    const gameState = this.activeGames.get(gameSessionId);

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

        // PAUSAR para celebrar
        gameState.isPaused = true;
        setTimeout(() => {
          gameState.isPaused = false;
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
        await this.endGame(gameSessionId, 'completed');
      }
    }
  }

  /**
   * Verifica si el cartón tiene alguna línea HORIZONTAL completa
   * (Solo líneas horizontales según nuevas reglas)
   */
  checkHorizontalLines(cardNumbers, calledNumbers) {
    const horizontalLines = [
      { type: 'horizontal_1', row: 0 },
      { type: 'horizontal_2', row: 1 },
      { type: 'horizontal_3', row: 2 },
      { type: 'horizontal_4', row: 3 },
      { type: 'horizontal_5', row: 4 }
    ];

    if (!cardNumbers || !Array.isArray(cardNumbers) || cardNumbers.length < 5) {
      // console.warn('Inválida estructura de cartón en checkHorizontalLines', cardNumbers);
      return { hasLine: false };
    }

    for (const line of horizontalLines) {
      const winningNumbers = [];
      let isComplete = true;

      for (let col = 0; col < 5; col++) {
        const number = cardNumbers[line.row][col];

        if (line.row === 2 && col === 2) {
          winningNumbers.push('FREE');
        } else if (calledNumbers.includes(number)) {
          winningNumbers.push(number);
        } else {
          isComplete = false;
          break;
        }
      }

      if (isComplete) {
        return {
          hasLine: true,
          lineType: line.type,
          winningNumbers
        };
      }
    }

    return { hasLine: false };
  }

  /**
   * Paga a los ganadores de línea (puede haber múltiples)
   */
  async payLineWinners(gameSessionId, winners) {
    const [session] = await pool.query('SELECT * FROM game_sessions WHERE id = ?', [gameSessionId]);
    const totalPrize = session[0].line_prize || 2500;
    const prizePerWinner = totalPrize / winners.length;

    const gameState = this.activeGames.get(gameSessionId);

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

    const gameState = this.activeGames.get(gameSessionId);

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
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) return;

    if (gameState.interval) {
      clearInterval(gameState.interval);
      gameState.interval = null;
    }

    // PERSISTIR RESULTADOS EN game_sessions antes de archivar
    const ballSequence = gameState.ballsDrawn;
    const [winners] = await pool.query(
      'SELECT user_id, prize_type, prize_amount, bolea_number FROM game_winners WHERE game_session_id = ?',
      [gameSessionId]
    );

    const lineaWinner = winners.find(w => w.prize_type === 'linea');
    const bingoWinner = winners.find(w => w.prize_type === 'bingo');

    const lineaBallNumber = lineaWinner ? lineaWinner.bolea_number : null;
    const lineaBallIndex = lineaBallNumber !== null ? ballSequence.indexOf(lineaBallNumber) : null;

    const bingoBallNumber = bingoWinner ? bingoWinner.bolea_number : null;
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

  validateBingo(cardNumbers, calledNumbers) {
    const winningNumbers = [];
    const missingNumbers = [];

    if (!cardNumbers || !Array.isArray(cardNumbers) || cardNumbers.length < 5) {
      return {
        isValid: false,
        winningNumbers: [],
        missingNumbers: [],
        totalMarked: 0,
        totalNeeded: 24
      };
    }

    for (let row = 0; row < 5; row++) {
      if (!cardNumbers[row] || !Array.isArray(cardNumbers[row]) || cardNumbers[row].length < 5) continue;

      for (let col = 0; col < 5; col++) {
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
    }

    return {
      isValid: missingNumbers.length === 0,
      winningNumbers,
      missingNumbers,
      totalMarked: winningNumbers.length,
      totalNeeded: 24
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
    if (Array.isArray(gridData) && gridData.length === 5) {
      return gridData;
    }

    if (typeof gridData === 'object' && gridData.B && gridData.I && gridData.N && gridData.G && gridData.O) {
      const matrix = [];
      for (let row = 0; row < 5; row++) {
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

    if (Array.isArray(gridData) && gridData.length === 25) {
      const matrix = [];
      for (let i = 0; i < 5; i++) {
        matrix.push(gridData.slice(i * 5, (i + 1) * 5));
      }
      return matrix;
    }

    return [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
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

      console.log(`\n🔍 [OfflineWinners] Verificando todos los cartones para bolilla ${currentBall}`);

      // 1. Obtener TODOS los cartones de la sesión (activos)
      const [cards] = await pool.query(`
        SELECT 
          pcs.id as card_id,
          pcs.user_id,
          pcs.card_data,
          pcs.line_won,
          pcs.bingo_won,
          u.username
        FROM player_card_selections pcs
        JOIN users u ON pcs.user_id = u.id
        WHERE pcs.session_id = ?
        AND pcs.status = 'active'
      `, [gameSessionId]);

      console.log(`🔍 [OfflineWinners] Verificando ${cards.length} cartones`);

      // 2. Verificar cada cartón
      for (const card of cards) {
        try {
          const cardData = JSON.parse(card.card_data);
          const cardNumbers = this.convertGridDataToMatrix(cardData);

          // Verificar Línea (si aún no ganó)
          if (!card.line_won) {
            const hasLine = this.checkHorizontalLines(cardNumbers, gameState.ballsDrawn);
            if (hasLine) {
              await this.registerLineWinner(gameSessionId, card.user_id, card.card_id, currentBall, card.username);
            }
          }

          // Verificar Bingo (si aún no ganó)
          if (!card.bingo_won) {
            const hasBingo = this.validateBingo(cardNumbers, gameState.ballsDrawn);
            if (hasBingo) {
              await this.registerBingoWinner(gameSessionId, card.user_id, card.card_id, currentBall, card.username);
            }
          }
        } catch (cardError) {
          console.error(`❌ [OfflineWinners] Error verificando cartón ${card.card_id}:`, cardError);
        }
      }

    } catch (error) {
      console.error('❌ [OfflineWinners] Error verificando ganadores:', error);
    }
  }

  /**
   * Registra un ganador de LÍNEA (conectado o offline)
   */
  async registerLineWinner(gameSessionId, userId, cardId, ballNumber, username) {
    try {
      const gameState = this.activeGames.get(gameSessionId);

      console.log(`🎉 [OfflineWinners] LÍNEA! Usuario ${username} (${userId}) - Cartón ${cardId} - Bolilla ${ballNumber}`);

      // 1. Marcar cartón como ganador de línea
      await pool.query(`
        UPDATE player_card_selections 
        SET line_won = TRUE, line_ball_number = ?
        WHERE id = ?
      `, [ballNumber, cardId]);

      // 2. Contar cuántos ganadores de línea hay en esta sesión
      const [winners] = await pool.query(`
        SELECT COUNT(*) as count
        FROM player_card_selections
        WHERE session_id = ? AND line_won = TRUE
      `, [gameSessionId]);

      const shareCount = winners[0].count;

      // 3. Obtener pozo de línea
      const [session] = await pool.query(`
        SELECT jackpot_linea FROM game_sessions WHERE id = ?
      `, [gameSessionId]);

      const totalPrize = parseFloat(session[0].jackpot_linea) || 0;
      const individualPrize = totalPrize / shareCount;

      // 4. Acreditar al balance del usuario
      await pool.query(`
        UPDATE users 
        SET balance = balance + ?
        WHERE id = ?
      `, [individualPrize, userId]);

      console.log(`💰 [OfflineWinners] Premio acreditado: $${individualPrize.toFixed(2)} (${shareCount} ganadores)`);

      // 5. Registrar en tabla de ganadores
      await pool.query(`
        INSERT INTO game_winners 
        (session_id, user_id, card_id, prize_type, ball_number, balls_drawn, prize_amount, share_count, balance_credited)
        VALUES (?, ?, ?, 'linea', ?, ?, ?, ?, TRUE)
      `, [gameSessionId, userId, cardId, ballNumber, JSON.stringify(gameState.ballsDrawn), individualPrize, shareCount]);

      // 6. Emitir evento a jugadores conectados
      this.io.to(`session_${gameSessionId}`).emit('line_winner', {
        userId,
        username,
        cardId,
        ballNumber,
        prize: individualPrize,
        shareCount,
        timestamp: new Date()
      });

      // También emitir a la sala global
      this.io.to(`room_${gameState.roomId}`).emit('line_winner', {
        userId,
        username,
        cardId,
        ballNumber,
        prize: individualPrize,
        shareCount,
        timestamp: new Date()
      });

      console.log(`📡 [OfflineWinners] Evento 'line_winner' emitido`);

    } catch (error) {
      console.error('❌ [OfflineWinners] Error registrando ganador de línea:', error);
    }
  }

  /**
   * Registra un ganador de BINGO (conectado o offline)
   */
  async registerBingoWinner(gameSessionId, userId, cardId, ballNumber, username) {
    try {
      const gameState = this.activeGames.get(gameSessionId);

      console.log(`🏆 [OfflineWinners] BINGO! Usuario ${username} (${userId}) - Cartón ${cardId} - Bolilla ${ballNumber}`);

      // 1. Marcar cartón como ganador de bingo
      await pool.query(`
        UPDATE player_card_selections 
        SET bingo_won = TRUE, bingo_ball_number = ?
        WHERE id = ?
      `, [ballNumber, cardId]);

      // 2. Contar cuántos ganadores de bingo hay (puede haber múltiples en la misma bolilla)
      const [winners] = await pool.query(`
        SELECT COUNT(*) as count
        FROM player_card_selections
        WHERE session_id = ? AND bingo_won = TRUE
      `, [gameSessionId]);

      const shareCount = winners[0].count;

      // 3. Obtener pozo de bingo
      const [session] = await pool.query(`
        SELECT jackpot_bingo FROM game_sessions WHERE id = ?
      `, [gameSessionId]);

      const totalPrize = parseFloat(session[0].jackpot_bingo) || 0;
      const individualPrize = totalPrize / shareCount;

      // 4. Acreditar al balance del usuario
      await pool.query(`
        UPDATE users 
        SET balance = balance + ?
        WHERE id = ?
      `, [individualPrize, userId]);

      console.log(`💰 [OfflineWinners] Premio BINGO acreditado: $${individualPrize.toFixed(2)} (${shareCount} ganadores)`);

      // 5. Registrar en tabla de ganadores
      await pool.query(`
        INSERT INTO game_winners 
        (session_id, user_id, card_id, prize_type, ball_number, balls_drawn, prize_amount, share_count, balance_credited)
        VALUES (?, ?, ?, 'bingo', ?, ?, ?, ?, TRUE)
      `, [gameSessionId, userId, cardId, ballNumber, JSON.stringify(gameState.ballsDrawn), individualPrize, shareCount]);

      // 6. Emitir evento a jugadores conectados
      this.io.to(`session_${gameSessionId}`).emit('bingo_winner', {
        userId,
        username,
        cardId,
        ballNumber,
        prize: individualPrize,
        shareCount,
        timestamp: new Date()
      });

      // También emitir a la sala global
      this.io.to(`room_${gameState.roomId}`).emit('bingo_winner', {
        userId,
        username,
        cardId,
        ballNumber,
        prize: individualPrize,
        shareCount,
        timestamp: new Date()
      });

      console.log(`📡 [OfflineWinners] Evento 'bingo_winner' emitido`);

      // 7. TERMINAR EL JUEGO
      console.log(`🏁 [OfflineWinners] Terminando juego por BINGO`);
      await this.endGame(gameSessionId, 'completed');

    } catch (error) {
      console.error('❌ [OfflineWinners] Error registrando ganador de bingo:', error);
    }
  }
}

module.exports = GameEngineAuto;
