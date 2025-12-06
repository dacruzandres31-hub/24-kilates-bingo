const pool = require('../config/database');
const { 
  notifyLineWinner, 
  notifyBingoWinner, 
  showPaymentForms 
} = require('../socket/winnerEvents');

/**
 * GAME ENGINE - Motor de Sorteo Automático y Validación de Cartones
 * 
 * FLUJO AUTOMÁTICO:
 * 1. Sistema canta número cada X segundos
 * 2. Sistema marca automáticamente en TODOS los cartones
 * 3. Sistema valida automáticamente líneas y bingos
 * 4. Sistema anuncia ganadores con cartel a todos
 * 5. Pausa 1-2 segundos para celebrar
 * 6. Continúa sorteo hasta BINGO
 * 7. Al terminar → muestra formularios de pago
 * 
 * El jugador NO canta línea - el sistema lo detecta y anuncia
 */

class GameEngine {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map(); // gameSessionId -> gameState
  }

  /**
   * Inicia un sorteo automático
   * @param {Number} gameSessionId 
   * @param {Object} options - { drawInterval: 5000, pauseOnWinner: 2000 }
   */
  async startGame(gameSessionId, options = {}) {
    const {
      drawInterval = 5000,      // 5 segundos entre números
      pauseOnWinner = 2000      // 2 segundos de pausa al cantar línea
    } = options;
  }

  // Ejecuta el sorteo completo para una sesión
  static async executeGame(session) {
    const { id: sessionId, room } = session;

    try {
      const drawnNumbers = new Set();
      let currentBall = 0;
      const winners = [];
      let lineaWinnerFound = false;
      let bingoWinnerFound = false;

      // Obtener todos los cartones vendidos en esta sesión
      const [cardsResult] = await pool.query(
        `SELECT 
          id AS cardId,
          buyer_id AS user_id,
          grid_numbers,
          already_won_line
         FROM daily_stock_cards
         WHERE status = 'sold' AND room = ?
         ORDER BY buyer_id ASC`,
        [room]
      );

      const cards = cardsResult;
      
      // Validar estructura de cartones antes de empezar
      for (const card of cards) {
        if (!isValidCard(card)) {
          console.error(`⚠️ Cartón ${card.cardId} tiene estructura inválida`);
          // Opcionalmente remover cartón inválido del juego
        }
      }

      // Sorteo iterativo: máximo 90 bolillas
      for (let ballCount = 0; ballCount < 90 && cards.length > 0; ballCount++) {
        // Generar próxima bolilla
        currentBall = this.generateNextBall(drawnNumbers);
        drawnNumbers.add(currentBall);

        // ⚡ OPTIMIZADO: Usar victoryChecker.js (O(1) con Set)
        const { lineWinners, bingoWinners } = checkWinners(
          cards,
          Array.from(drawnNumbers)
        );

        // Procesar ganadores de LÍNEA (si no hay ganador previo)
        if (!lineaWinnerFound && lineWinners.length > 0) {
          for (const winner of lineWinners) {
            const lineaPrize = session.current_pot_linea;
            
            // Acreditar fichas al ganador automáticamente
            await ChipsService.recordGameMovement(
              winner.userId,
              lineaPrize,
              sessionId,
              'win',
              `Premio LÍNEA - Sesión ${sessionId} - Bolea ${currentBall}`
            );
            
            // Marcar cartón como ya ganó línea
            await pool.query(
              'UPDATE daily_stock_cards SET already_won_line = true WHERE id = ?',
              [winner.cardId]
            );
            
            winners.push({
              userId: winner.userId,
              cardId: winner.cardId,
              amount: lineaPrize,
              type: 'linea',
              boleaNumber: currentBall
            });
          }
          lineaWinnerFound = true;
        }

        // Procesar ganadores de BINGO
        if (bingoWinners.length > 0) {
          for (const winner of bingoWinners) {
            const bingoPrize = session.current_pot_bingo;
            const isJackpot = currentBall > 40;
            
            // Acreditar fichas al ganador automáticamente
            await ChipsService.recordGameMovement(
              winner.userId,
              bingoPrize,
              sessionId,
              'win',
              `Premio BINGO${isJackpot ? ' JACKPOT' : ''} - Sesión ${sessionId} - Bolea ${currentBall}`
            );
            
            winners.push({
              userId: winner.userId,
              cardId: winner.cardId,
              amount: bingoPrize,
              type: 'bingo',
              boleaNumber: currentBall,
              isJackpot
            });
            
            // Remover cartón ganador del pool
            const cardIndex = cards.findIndex(c => c.cardId === winner.cardId);
            if (cardIndex !== -1) {
              cards.splice(cardIndex, 1);
            }
          }
          bingoWinnerFound = true;
          break; // Una sesión, un ganador de bingo
        }
      }

      // Retornar resultado del game
      return {
        sessionId,
        drawnNumbers: Array.from(drawnNumbers),
        winners,
        totalBallsDrawn: drawnNumbers.size,
        bingoWinner: winners.find(w => w.type === 'bingo'),
        lineaWinner: winners.find(w => w.type === 'linea'),
        jackpotTriggered: winners.some(w => w.isJackpot && w.type === 'bingo')
      };
    } catch (error) {
      console.error('Game engine error:', error);
      throw new Error('Error ejecutando game engine');
    }
  }

  // Verifica si un número cae en rango de la columna (BINGO tiene 5 columnas, cada una con 18 números)
  // Columna 1 (B): 1-15
  // Columna 2 (I): 16-30
  // Columna 3 (N): 31-45
  // Columna 4 (G): 46-60
  // Columna 5 (O): 61-75
  static getColumnForNumber(number) {
    if (number >= 1 && number <= 15) return 0;   // B
    if (number >= 16 && number <= 30) return 1;  // I
    if (number >= 31 && number <= 45) return 2;  // N
    if (number >= 46 && number <= 60) return 3;  // G
    if (number >= 61 && number <= 75) return 4;  // O
    return -1;
  }

  // Genera un cartón válido (respeta distribución por columnas)
  static generateValidCard() {
    const card = Array(5).fill(null).map(() => Array(5).fill(null));
    const usedNumbers = new Set();

    for (let col = 0; col < 5; col++) {
      const columnRanges = [
        [1, 15],   // B
        [16, 30],  // I
        [31, 45],  // N
        [46, 60],  // G
        [61, 75]   // O
      ];

      const [min, max] = columnRanges[col];

      // Seleccionar 5 números únicos para esta columna
      const columnNumbers = [];
      while (columnNumbers.length < 5) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!usedNumbers.has(num)) {
          columnNumbers.push(num);
          usedNumbers.add(num);
        }
      }

      // Colocar en la columna
      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          card[row][col] = null; // FREE SPACE en el centro
        } else {
          card[row][col] = columnNumbers[row];
        }
      }
    }

    return card;
  }

  // Generar N cartones únicos (para dailyGenerator)
  static generateUniqueCards(count) {
    const cards = [];
    const cardStrings = new Set();

    while (cards.length < count) {
      const card = this.generateValidCard();
      const cardString = JSON.stringify(card);

      if (!cardStrings.has(cardString)) {
        cardStrings.add(cardString);
        cards.push(card);
      }
    }

    return cards;
  }
}

module.exports = GameEngine;
