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
const { 
  notifyLineWinner, 
  notifyBingoWinner, 
  showPaymentForms 
} = require('../socket/winnerEvents');

class GameEngineAuto {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map(); // gameSessionId -> gameState
  }

  /**
   * Inicia un sorteo automático
   */
  async startGame(gameSessionId, options = {}) {
    const {
      drawInterval = 5000,      // 5 segundos entre números
      pauseOnWinner = 2000      // 2 segundos de pausa al cantar línea
    } = options;

    const [sessions] = await pool.query(
      'SELECT * FROM game_sessions WHERE id = ? AND status = ?',
      [gameSessionId, 'active']
    );

    if (sessions.length === 0) {
      throw new Error('Sesión no encontrada o no está activa');
    }

    const session = sessions[0];

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

    // Obtener números ya cantados
    const [existingBalls] = await pool.query(
      'SELECT ball_number FROM game_session_balls WHERE game_session_id = ? ORDER BY draw_order',
      [gameSessionId]
    );

    gameState.ballsDrawn = existingBalls.map(b => b.ball_number);
    gameState.availableBalls = gameState.availableBalls.filter(
      b => !gameState.ballsDrawn.includes(b)
    );

    // Iniciar sorteo automático
    gameState.interval = setInterval(async () => {
      if (gameState.isPaused) return;

      try {
        await this.drawNextBall(gameSessionId, pauseOnWinner);
      } catch (error) {
        console.error(`[GameEngine] Error en sorteo ${gameSessionId}:`, error);
        this.stopGame(gameSessionId);
      }
    }, drawInterval);

    console.log(`[GameEngine] 🎮 Juego ${gameSessionId} iniciado (sala: ${session.room})`);
    
    this.io.to(`room_${session.room}`).emit('game_started', {
      gameSessionId,
      drawInterval,
      totalBalls: 75
    });

    return gameState;
  }

  generateBallPool() {
    const balls = [];
    for (let i = 1; i <= 75; i++) {
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

    await pool.query(
      `INSERT INTO game_session_balls (game_session_id, ball_number, ball_letter, draw_order)
       VALUES (?, ?, ?, ?)`,
      [gameSessionId, ballNumber, ballLetter, drawOrder]
    );

    console.log(`[GameEngine] 🎱 ${ballLetter}-${ballNumber} (#${drawOrder})`);

    // Emitir a todos los jugadores
    this.io.to(`room_${gameState.roomId}`).emit('ball_drawn', {
      gameSessionId,
      ballNumber,
      ballLetter,
      drawOrder,
      totalDrawn: gameState.ballsDrawn.length
    });

    // VALIDAR AUTOMÁTICAMENTE TODOS LOS CARTONES
    await this.validateAllCards(gameSessionId, pauseOnWinner);

    // EMITIR REORDENAMIENTO DE CARTONES (para usuarios con múltiples cartones)
    await this.emitCardsReordering(gameSessionId);
  }

  /**
   * Emite evento de reordenamiento de cartones a cada usuario
   */
  async emitCardsReordering(gameSessionId) {
    try {
      const CardAnalyzer = require('./cardAnalyzer');

      // Obtener todos los usuarios con cartones activos en esta sesión
      const [users] = await pool.query(
        `SELECT DISTINCT user_id FROM bingo_cards 
         WHERE session_id = ? AND status = 'active'`,
        [gameSessionId]
      );

      // Para cada usuario, analizar sus cartones y emitir evento personal
      for (const { user_id } of users) {
        // Obtener cartones del usuario
        const [userCards] = await pool.query(
          `SELECT * FROM bingo_cards 
           WHERE user_id = ? AND session_id = ? AND status = 'active'
           ORDER BY id ASC`,
          [user_id, gameSessionId]
        );

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
      `SELECT bc.*, u.username 
       FROM bingo_cards bc
       JOIN users u ON bc.user_id = u.id
       WHERE bc.session_id = ? AND bc.status = 'active'`,
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
        if (card.numbers) {
          cardNumbers = typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;
        } else if (card.grid_data) {
          const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
          cardNumbers = this.convertGridDataToMatrix(gridData);
        } else {
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
        if (card.numbers) {
          cardNumbers = typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;
        } else if (card.grid_data) {
          const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
          cardNumbers = this.convertGridDataToMatrix(gridData);
        } else {
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
        gameState.roomId,
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
        gameState.roomId,
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

    await pool.query(
      'UPDATE game_sessions SET status = ? WHERE id = ?',
      [status, gameSessionId]
    );

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

    this.io.to(`room_${gameState.roomId}`).emit('game_ended', {
      gameSessionId,
      status,
      totalBallsDrawn: gameState.ballsDrawn.length
    });

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
    if (number >= 1 && number <= 15) return 'B';
    if (number >= 16 && number <= 30) return 'I';
    if (number >= 31 && number <= 45) return 'N';
    if (number >= 46 && number <= 60) return 'G';
    if (number >= 61 && number <= 75) return 'O';
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

    for (let row = 0; row < 5; row++) {
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
      case 'horizontal_1': return [[0,0],[0,1],[0,2],[0,3],[0,4]];
      case 'horizontal_2': return [[1,0],[1,1],[1,2],[1,3],[1,4]];
      case 'horizontal_3': return [[2,0],[2,1],[2,2],[2,3],[2,4]];
      case 'horizontal_4': return [[3,0],[3,1],[3,2],[3,3],[3,4]];
      case 'horizontal_5': return [[4,0],[4,1],[4,2],[4,3],[4,4]];
      case 'vertical_1': return [[0,0],[1,0],[2,0],[3,0],[4,0]];
      case 'vertical_2': return [[0,1],[1,1],[2,1],[3,1],[4,1]];
      case 'vertical_3': return [[0,2],[1,2],[2,2],[3,2],[4,2]];
      case 'vertical_4': return [[0,3],[1,3],[2,3],[3,3],[4,3]];
      case 'vertical_5': return [[0,4],[1,4],[2,4],[3,4],[4,4]];
      case 'diagonal_1': return [[0,0],[1,1],[2,2],[3,3],[4,4]];
      case 'diagonal_2': return [[0,4],[1,3],[2,2],[3,1],[4,0]];
      case 'four_corners': return [[0,0],[0,4],[4,0],[4,4]];
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

    return [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]];
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
}

module.exports = GameEngineAuto;
