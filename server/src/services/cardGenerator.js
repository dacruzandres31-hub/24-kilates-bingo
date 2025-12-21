/**
 * GENERADOR DE CARTONES BINGO 90
 * 
 * Genera cartones aleatorios únicos siguiendo las reglas oficiales:
 * - 3 filas x 9 columnas
 * - 5 números por fila (4 espacios vacíos)
 * - Columnas organizadas por decenas (1-10, 11-20, ..., 81-90)
 * - Números ordenados de menor a mayor en cada columna
 * - No puede haber columnas completamente vacías
 */

class BingoCardGenerator {
  constructor() {
    // Rangos de números por columna
    this.columnRanges = [
      [1, 9],    // Columna 0: 1-9
      [10, 19],  // Columna 1: 10-19
      [20, 29],  // Columna 2: 20-29
      [30, 39],  // Columna 3: 30-39
      [40, 49],  // Columna 4: 40-49
      [50, 59],  // Columna 5: 50-59
      [60, 69],  // Columna 6: 60-69
      [70, 79],  // Columna 7: 70-79
      [80, 90]   // Columna 8: 80-90
    ];
  }

  /**
   * Genera un lote de cartones únicos para una sesión
   * @param {number} quantity - Cantidad de cartones a generar
   * @param {string} sessionId - ID de la sesión
   * @param {string} roomLetter - Letra de la sala (S=Starter, B=Bronze, etc)
   * @param {number} counterStart - Contador global inicial para seriales únicos
   * @returns {Array} Array de cartones con números y serial
   */
  generateCardBatch(quantity, sessionId, roomLetter = 'S', counterStart = 0) {
    const cards = [];
    const usedHashes = new Set(); // Prevenir duplicados exactos
    const timestamp = Date.now(); // Timestamp único para este lote

    console.log(`🎫 Generando ${quantity} cartones para sesión ${sessionId}...`);

    for (let i = 0; i < quantity; i++) {
      let card;
      let attempts = 0;
      const maxAttempts = 50; // Reducido de 100 a 50

      // Generar cartón único (verificar que no sea duplicado)
      do {
        card = this.generateSingleCard();
        const cardHash = this.hashCard(card);
        
        if (!usedHashes.has(cardHash)) {
          usedHashes.add(cardHash);
          break;
        }
        
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts === maxAttempts) {
        console.warn(`⚠️ Cartón ${i+1}/${quantity} - No se pudo generar único después de ${maxAttempts} intentos, reintentando...`);
        // Forzar generación incluso si es similar
        card = this.generateSingleCard();
      }

      // Generar serial único usando contador global
      const globalCounter = counterStart + i;
      const serial = this.generateUniqueSerial(globalCounter, roomLetter, timestamp);

      // Log de progreso cada 20 cartones
      if ((i + 1) % 20 === 0 || i === quantity - 1) {
        console.log(`   Progreso: ${i + 1}/${quantity} cartones generados`);
      }

      cards.push({
        id: `${sessionId}_${i}`,
        serial,
        numbers: card,
        sessionId,
        status: 'available'
      });
    }

    return cards;
  }

  /**
   * Genera un cartón individual siguiendo las reglas oficiales
   * @returns {Array} Matriz 3x9 con números y nulls
   */
  generateSingleCard() {
    const card = Array(3).fill(null).map(() => Array(9).fill(null));
    
    // Paso 1: Decidir cuántos números por columna (distribución válida)
    const numbersPerColumn = this.generateValidDistribution();
    
    // Paso 2: Generar y colocar números en cada columna
    for (let col = 0; col < 9; col++) {
      const count = numbersPerColumn[col];
      if (count === 0) continue;

      // Obtener números aleatorios del rango de esta columna
      const [min, max] = this.columnRanges[col];
      const numbers = this.getRandomNumbers(min, max, count);
      numbers.sort((a, b) => a - b); // Ordenar de menor a mayor

      // Distribuir en las 3 filas (asegurando max 5 por fila)
      const positions = this.distributeInRows(col, count, card);
      
      positions.forEach((row, idx) => {
        card[row][col] = numbers[idx];
      });
    }

    // Paso 3: Verificar que cada fila tenga exactamente 5 números
    if (!this.validateCard(card)) {
      console.warn('⚠️ Cartón inválido generado, reintentando...');
      return this.generateSingleCard(); // Recursión hasta obtener válido
    }

    return card;
  }

  /**
   * Genera distribución válida de números por columna
   * Total: 15 números (5 por fila)
   * Restricción: ninguna columna con más de 3 números (3 filas)
   */
  generateValidDistribution() {
    const distribution = Array(9).fill(0);
    let remaining = 15;

    // Distribuir uniformemente: al menos 1 número por columna en 9 columnas da 9
    // Quedan 6 números más para distribuir
    
    // Paso 1: Poner 1 número en cada columna (9 números)
    for (let i = 0; i < 9; i++) {
      distribution[i] = 1;
    }
    remaining -= 9;

    // Paso 2: Distribuir los 6 restantes aleatoriamente (máximo 2 más por columna)
    while (remaining > 0) {
      const col = Math.floor(Math.random() * 9);
      if (distribution[col] < 3) { // Máximo 3 por columna
        distribution[col]++;
        remaining--;
      }
    }

    return distribution;
  }

  /**
   * Distribuye números de una columna en 3 filas respetando límite de 5 por fila
   */
  distributeInRows(col, count, card) {
    const availableRows = [0, 1, 2];
    const positions = [];

    // Contar cuántos números tiene cada fila actualmente
    const rowCounts = card.map(row => row.filter(n => n !== null).length);

    // Distribuir según disponibilidad
    for (let i = 0; i < count; i++) {
      // Filtrar filas que no estén llenas (< 5 números)
      const validRows = availableRows.filter(r => rowCounts[r] < 5);
      
      if (validRows.length === 0) {
        console.error('❌ No hay filas disponibles para distribuir números');
        break;
      }

      // Elegir fila aleatoria de las válidas
      const rowIdx = Math.floor(Math.random() * validRows.length);
      const row = validRows[rowIdx];
      
      positions.push(row);
      rowCounts[row]++;
      
      // Si la fila se llenó, removerla de disponibles
      if (rowCounts[row] >= 5) {
        const idx = availableRows.indexOf(row);
        if (idx > -1) availableRows.splice(idx, 1);
      }
    }

    return positions;
  }

  /**
   * Obtiene N números aleatorios únicos dentro de un rango
   */
  getRandomNumbers(min, max, count) {
    const numbers = [];
    const available = [];
    
    for (let i = min; i <= max; i++) {
      available.push(i);
    }

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * available.length);
      numbers.push(available[idx]);
      available.splice(idx, 1);
    }

    return numbers;
  }

  /**
   * Valida que el cartón cumpla todas las reglas
   */
  validateCard(card) {
    // Verificar que cada fila tenga exactamente 5 números
    for (let row = 0; row < 3; row++) {
      const count = card[row].filter(n => n !== null).length;
      if (count !== 5) return false;
    }

    // Verificar que ninguna columna esté completamente vacía si tiene números
    // (opcional, depende de la variante del bingo)
    
    // Verificar que los números estén en el rango correcto por columna
    for (let col = 0; col < 9; col++) {
      const [min, max] = this.columnRanges[col];
      for (let row = 0; row < 3; row++) {
        const num = card[row][col];
        if (num !== null && (num < min || num > max)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Genera un hash único para un cartón (detectar duplicados)
   */
  hashCard(card) {
    const numbers = card.flat().filter(n => n !== null).sort((a, b) => a - b);
    return numbers.join('-');
  }

  /**
   * Genera serial único global: SALA-YYYYMMDD-NNNNNN
   * Ejemplo: STA-20251220-000001 (Starter)
   *          BRO-20251220-000045 (Bronce)
   * Garantiza legibilidad y trazabilidad por fecha
   */
  generateUniqueSerial(globalCounter, roomLetter, timestamp) {
    // Mapeo de letra de sala a prefijo
    const roomPrefixes = {
      'S': 'STA',  // Starter
      'B': 'BRO',  // Bronce (Bronze)
      'P': 'PLA',  // Plata (Silver)
      'O': 'ORO'   // Oro (Gold)
    };
    
    const prefix = roomPrefixes[roomLetter] || 'XXX';
    
    // Fecha en formato YYYYMMDD
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Contador con 6 dígitos (soporta hasta 999,999 cartones por día)
    const counterStr = String(globalCounter).padStart(6, '0');
    
    // Formato: SALA-YYYYMMDD-NNNNNN
    return `${prefix}-${dateStr}-${counterStr}`;
  }

  /**
   * [DEPRECATED] Método antiguo - mantener por compatibilidad
   */
  generateSerial(index, roomLetter) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const cardNumber = String(index + 1).padStart(4, '0');
    return `${day}${month}${year}-${roomLetter}${cardNumber}`;
  }

  /**
   * Shuffle array (algoritmo Fisher-Yates)
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = BingoCardGenerator;
