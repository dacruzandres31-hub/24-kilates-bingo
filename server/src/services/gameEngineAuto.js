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

    // Estado del juego
    const gameState = {
      sessionId: gameSessionId,
      roomId: session.room,
      ballsDrawn: [],
      availableBalls: this.generateBallPool(),
      interval: null,
      isPaused: false,
      lineWinnersFound: new Set(),
      bingoWinner: null
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

      // VERIFICAR LÍNEAS
      const lineKey = `${userId}_${card.id}`;
      if (!gameState.lineWinnersFound.has(lineKey)) {
        const lineResult = await this.checkLines(
          gameSessionId, 
          card.id, 
          userId, 
          username,
          cardNumbers, 
          calledNumbers
        );

        if (lineResult) {
          gameState.lineWinnersFound.add(lineKey);
          
          // PAUSAR sorteo para celebrar
          gameState.isPaused = true;
          setTimeout(() => {
            gameState.isPaused = false;
          }, pauseOnWinner);
        }
      }

      // VERIFICAR BINGO
      if (!gameState.bingoWinner) {
        const bingoResult = await this.checkBingo(
          gameSessionId,
          card.id,
          userId,
          username,
          cardNumbers,
          calledNumbers
        );

        if (bingoResult) {
          gameState.bingoWinner = { userId, username };
          await this.endGame(gameSessionId, 'completed');
          return;
        }
      }
    }
  }

  /**
   * Valida todas las líneas posibles en un cartón
   */
  async checkLines(gameSessionId, cardId, userId, username, cardNumbers, calledNumbers) {
    const lineTypes = [
      'horizontal_1', 'horizontal_2', 'horizontal_3', 'horizontal_4', 'horizontal_5',
      'vertical_1', 'vertical_2', 'vertical_3', 'vertical_4', 'vertical_5',
      'diagonal_1', 'diagonal_2', 'four_corners'
    ];

    for (const lineType of lineTypes) {
      const [existing] = await pool.query(
        `SELECT id FROM game_winners 
         WHERE game_session_id = ? AND user_id = ? AND card_id = ? 
         AND prize_type = 'linea' AND line_type = ?`,
        [gameSessionId, userId, cardId, lineType]
      );

      if (existing.length > 0) continue;

      const validation = this.validateLine(cardNumbers, calledNumbers, lineType);

      if (validation.isValid) {
        const [session] = await pool.query('SELECT * FROM game_sessions WHERE id = ?', [gameSessionId]);
        const prizeAmount = session[0].line_prize || 2500;

        await pool.query(
          `INSERT INTO game_winners 
           (game_session_id, user_id, card_id, prize_type, prize_amount, line_type, winning_numbers, verified)
           VALUES (?, ?, ?, 'linea', ?, ?, ?, TRUE)`,
          [gameSessionId, userId, cardId, prizeAmount, lineType, JSON.stringify(validation.winningNumbers)]
        );

        console.log(`[GameEngine] 🎉 LÍNEA (${lineType}) - ${username} - $${prizeAmount}`);

        const gameState = this.activeGames.get(gameSessionId);
        notifyLineWinner(
          this.io, 
          gameState.roomId, 
          { id: userId, username }, 
          prizeAmount, 
          lineType
        );

        return true;
      }
    }

    return false;
  }

  /**
   * Valida BINGO completo
   */
  async checkBingo(gameSessionId, cardId, userId, username, cardNumbers, calledNumbers) {
    const [existing] = await pool.query(
      `SELECT id FROM game_winners 
       WHERE game_session_id = ? AND user_id = ? AND card_id = ? AND prize_type = 'bingo'`,
      [gameSessionId, userId, cardId]
    );

    if (existing.length > 0) return false;

    const validation = this.validateBingo(cardNumbers, calledNumbers);

    if (validation.isValid) {
      const [session] = await pool.query('SELECT * FROM game_sessions WHERE id = ?', [gameSessionId]);
      const prizeAmount = session[0].bingo_prize || 25000;

      await pool.query(
        `INSERT INTO game_winners 
         (game_session_id, user_id, card_id, prize_type, prize_amount, winning_numbers, verified)
         VALUES (?, ?, ?, 'bingo', ?, ?, TRUE)`,
        [gameSessionId, userId, cardId, prizeAmount, JSON.stringify(validation.winningNumbers)]
      );

      console.log(`[GameEngine] 🎊 BINGO - ${username} - $${prizeAmount}`);

      const gameState = this.activeGames.get(gameSessionId);
      notifyBingoWinner(
        this.io,
        gameState.roomId,
        { id: userId, username },
        prizeAmount,
        gameSessionId
      );

      return true;
    }

    return false;
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
}

module.exports = GameEngineAuto;
