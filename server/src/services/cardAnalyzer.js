/**
 * CARD ANALYZER - Analiza el progreso de cartones en tiempo real
 * 
 * Funcionalidades:
 * 1. Calcula números marcados vs total
 * 2. Detecta líneas casi completas (a 1, 2, 3 números)
 * 3. Ordena cartones por progreso (más cerca de ganar = primero)
 * 4. Genera alertas: "4 cartones a 2 números de línea"
 */

class CardAnalyzer {
  /**
   * Analiza todos los cartones de un usuario en una sesión
   * @param {Array} userCards - Cartones del usuario con grid_data
   * @param {Array} calledNumbers - Números cantados en la sesión
   * @returns {Object} Análisis completo con ordenamiento y alertas
   */
  static analyzeUserCards(userCards, calledNumbers) {
    const calledSet = new Set(calledNumbers);
    const analyzedCards = [];

    // Analizar cada cartón
    for (const card of userCards) {
      const analysis = this.analyzeCard(card, calledSet);
      analyzedCards.push({
        cardId: card.id,
        ...analysis,
        originalIndex: userCards.indexOf(card)
      });
    }

    // Ordenar por progreso (score descendente)
    analyzedCards.sort((a, b) => b.score - a.score);

    // Generar alertas
    const alerts = this.generateAlerts(analyzedCards);

    return {
      cards: analyzedCards,
      alerts,
      totalCards: userCards.length,
      summary: {
        totalMarked: analyzedCards.reduce((sum, c) => sum + c.markedCount, 0),
        averageProgress: analyzedCards.reduce((sum, c) => sum + c.progress, 0) / userCards.length,
        bestCard: analyzedCards[0],
        worstCard: analyzedCards[analyzedCards.length - 1]
      }
    };
  }

  /**
   * Analiza un cartón individual
   */
  static analyzeCard(card, calledSet) {
    const cardNumbers = this.parseCardNumbers(card);
    
    let markedCount = 0;
    let totalNumbers = 0;
    const markedPositions = [];

    // Contar marcados
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const number = cardNumbers[row][col];
        
        if (row === 2 && col === 2) {
          // FREE space siempre marcado
          markedCount++;
          totalNumbers++;
          markedPositions.push({ row, col, number: 'FREE', marked: true });
        } else {
          totalNumbers++;
          const isMarked = calledSet.has(number);
          if (isMarked) markedCount++;
          markedPositions.push({ row, col, number, marked: isMarked });
        }
      }
    }

    // Analizar líneas
    const lineAnalysis = this.analyzeLines(cardNumbers, calledSet);

    // Calcular score (prioridad para ordenamiento)
    const score = this.calculateScore(markedCount, lineAnalysis);

    return {
      markedCount,
      totalNumbers,
      progress: (markedCount / totalNumbers * 100).toFixed(1),
      markedPositions,
      lineAnalysis,
      score,
      gridNumbers: cardNumbers
    };
  }

  /**
   * Analiza todas las líneas posibles
   * NUEVA REGLA: Solo líneas HORIZONTALES se pagan en el juego
   * (Mantenemos análisis de otras para información, pero no se pagan)
   */
  static analyzeLines(cardNumbers, calledSet) {
    const lineTypes = [
      // SOLO HORIZONTALES (las que se pagan)
      { type: 'horizontal_1', name: 'Horizontal 1', positions: [[0,0],[0,1],[0,2],[0,3],[0,4]], payable: true },
      { type: 'horizontal_2', name: 'Horizontal 2', positions: [[1,0],[1,1],[1,2],[1,3],[1,4]], payable: true },
      { type: 'horizontal_3', name: 'Horizontal 3', positions: [[2,0],[2,1],[2,2],[2,3],[2,4]], payable: true },
      { type: 'horizontal_4', name: 'Horizontal 4', positions: [[3,0],[3,1],[3,2],[3,3],[3,4]], payable: true },
      { type: 'horizontal_5', name: 'Horizontal 5', positions: [[4,0],[4,1],[4,2],[4,3],[4,4]], payable: true }
      // Verticales, diagonales y esquinas NO SE PAGAN (eliminadas)
    ];

    const analysis = [];

    for (const lineType of lineTypes) {
      let marked = 0;
      let missing = 0;
      const missingNumbers = [];

      for (const [row, col] of lineType.positions) {
        const number = cardNumbers[row][col];

        // FREE space siempre cuenta
        if (row === 2 && col === 2) {
          marked++;
        } else if (calledSet.has(number)) {
          marked++;
        } else {
          missing++;
          missingNumbers.push(number);
        }
      }

      const total = lineType.positions.length;
      const isComplete = missing === 0;
      const almostComplete = missing <= 3; // A 1, 2 o 3 números

      analysis.push({
        type: lineType.type,
        name: lineType.name,
        marked,
        missing,
        total,
        missingNumbers,
        isComplete,
        almostComplete,
        progress: (marked / total * 100).toFixed(0),
        payable: lineType.payable || false  // Indicar si esta línea se paga
      });
    }

    // Ordenar por progreso
    analysis.sort((a, b) => b.marked - a.marked);

    return analysis;
  }

  /**
   * Calcula score para ordenamiento (cartones más prometedores primero)
   */
  static calculateScore(markedCount, lineAnalysis) {
    let score = markedCount * 10; // Base: números marcados

    // Bonus por líneas casi completas
    lineAnalysis.forEach(line => {
      if (line.isComplete) {
        score += 1000; // Línea completa
      } else if (line.missing === 1) {
        score += 500; // A 1 número
      } else if (line.missing === 2) {
        score += 200; // A 2 números
      } else if (line.missing === 3) {
        score += 50; // A 3 números
      }
    });

    return score;
  }

  /**
   * Genera alertas contextuales
   */
  static generateAlerts(analyzedCards) {
    const alerts = [];

    // Contar cartones por proximidad a línea
    const at1Ball = analyzedCards.filter(c => 
      c.lineAnalysis.some(l => l.missing === 1 && !l.isComplete)
    ).length;

    const at2Balls = analyzedCards.filter(c => 
      c.lineAnalysis.some(l => l.missing === 2 && !l.isComplete)
    ).length;

    const at3Balls = analyzedCards.filter(c => 
      c.lineAnalysis.some(l => l.missing === 3 && !l.isComplete)
    ).length;

    const completedLines = analyzedCards.filter(c => 
      c.lineAnalysis.some(l => l.isComplete)
    ).length;

    // Generar alertas en orden de prioridad
    if (at1Ball > 0) {
      alerts.push({
        type: 'critical',
        icon: '🔥',
        message: `¡${at1Ball} cartón${at1Ball > 1 ? 'es' : ''} a 1 número de LÍNEA!`,
        count: at1Ball,
        priority: 1
      });
    }

    if (at2Balls > 0) {
      alerts.push({
        type: 'warning',
        icon: '⚠️',
        message: `${at2Balls} cartón${at2Balls > 1 ? 'es' : ''} a 2 números de línea`,
        count: at2Balls,
        priority: 2
      });
    }

    if (at3Balls > 0) {
      alerts.push({
        type: 'info',
        icon: 'ℹ️',
        message: `${at3Balls} cartón${at3Balls > 1 ? 'es' : ''} a 3 números de línea`,
        count: at3Balls,
        priority: 3
      });
    }

    if (completedLines > 0) {
      alerts.push({
        type: 'success',
        icon: '✅',
        message: `¡${completedLines} línea${completedLines > 1 ? 's' : ''} completa${completedLines > 1 ? 's' : ''}!`,
        count: completedLines,
        priority: 0
      });
    }

    // Análisis de BINGO
    const nearBingo = analyzedCards.filter(c => c.markedCount >= 20).length;
    if (nearBingo > 0) {
      alerts.push({
        type: 'super-critical',
        icon: '🎊',
        message: `¡${nearBingo} cartón${nearBingo > 1 ? 'es' : ''} cerca de BINGO!`,
        count: nearBingo,
        priority: -1
      });
    }

    return alerts.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Parsea números del cartón (maneja grid_data o numbers)
   */
  static parseCardNumbers(card) {
    if (card.numbers) {
      return typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;
    }

    if (card.grid_data) {
      const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
      return this.convertGridDataToMatrix(gridData);
    }

    throw new Error('Cartón sin datos válidos');
  }

  static convertGridDataToMatrix(gridData) {
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

  /**
   * Genera datos para la vista apilada (z-index + offset)
   */
  static generateStackedView(analyzedCards, maxVisible = 20) {
    return analyzedCards.slice(0, maxVisible).map((card, index) => ({
      ...card,
      viewConfig: {
        zIndex: maxVisible - index, // Mejor cartón = mayor z-index
        offsetY: index * 15,         // Offset vertical (15px entre cartones)
        offsetX: index * 5,          // Offset horizontal (efecto 3D)
        opacity: Math.max(0.6, 1 - (index * 0.02)), // Fade suave
        isTop: index === 0,          // Indica si es el cartón principal
        isVisible: index < 10        // Solo primeros 10 completamente visibles
      }
    }));
  }
}

module.exports = CardAnalyzer;
