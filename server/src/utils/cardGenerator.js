/**
 * Generador de Cartones de Bingo
 * Genera cartones válidos de 3x9 con distribución correcta
 */

class BingoCardGenerator {
  /**
   * Genera un cartón de bingo válido
   * - 3 filas x 9 columnas
   * - Cada fila tiene 5 números y 4 espacios vacíos
   * - Columna 0: 1-9, Columna 1: 10-19, ..., Columna 8: 80-90
   * - Números ordenados de menor a mayor en cada columna
   * - No se repiten números en el cartón
   * @returns {Array} Matriz 3x9 con el cartón
   */
  static generateCard() {
    // Inicializar matriz vacía (null = espacio vacío)
    const card = Array(3).fill(null).map(() => Array(9).fill(null));
    
    // Generar números para cada columna
    const columnNumbers = [];
    for (let col = 0; col < 9; col++) {
      const min = col === 0 ? 1 : col * 10;
      const max = col === 8 ? 90 : (col + 1) * 10 - 1;
      
      // Generar 3 números únicos para esta columna
      const numbers = this.getUniqueRandomNumbers(min, max, 3);
      numbers.sort((a, b) => a - b); // Ordenar de menor a mayor
      columnNumbers.push(numbers);
    }
    
    // Distribuir números en las filas (5 números por fila)
    for (let row = 0; row < 3; row++) {
      // Seleccionar 5 columnas aleatorias para esta fila
      const selectedCols = this.selectRandomColumns(9, 5);
      
      // Colocar números en las columnas seleccionadas
      selectedCols.forEach(col => {
        card[row][col] = columnNumbers[col].shift();
      });
    }
    
    // Verificar que todas las columnas tengan al menos un número
    this.ensureAllColumnsHaveNumbers(card, columnNumbers);
    
    return card;
  }
  
  /**
   * Genera números aleatorios únicos en un rango
   */
  static getUniqueRandomNumbers(min, max, count) {
    const numbers = [];
    const available = [];
    
    for (let i = min; i <= max; i++) {
      available.push(i);
    }
    
    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * available.length);
      numbers.push(available[index]);
      available.splice(index, 1);
    }
    
    return numbers;
  }
  
  /**
   * Selecciona columnas aleatorias sin repetir
   */
  static selectRandomColumns(total, count) {
    const columns = [];
    const available = Array.from({ length: total }, (_, i) => i);
    
    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * available.length);
      columns.push(available[index]);
      available.splice(index, 1);
    }
    
    return columns.sort((a, b) => a - b);
  }
  
  /**
   * Asegura que todas las columnas tengan al menos un número
   */
  static ensureAllColumnsHaveNumbers(card, columnNumbers) {
    for (let col = 0; col < 9; col++) {
      let hasNumber = false;
      
      for (let row = 0; row < 3; row++) {
        if (card[row][col] !== null) {
          hasNumber = true;
          break;
        }
      }
      
      // Si la columna está vacía, colocar un número sobrante
      if (!hasNumber && columnNumbers[col].length > 0) {
        const emptyRow = card.findIndex(row => {
          const numbersInRow = row.filter(n => n !== null).length;
          return numbersInRow < 5;
        });
        
        if (emptyRow !== -1) {
          card[emptyRow][col] = columnNumbers[col].shift();
        }
      }
    }
  }
  
  /**
   * Genera un número de serie único para el cartón
   * Formato: SALA-YYYYMMDD-NNNNNN
   */
  static generateSerial(room, index) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const number = String(index).padStart(6, '0');
    
    const roomPrefix = room.toUpperCase().substring(0, 3);
    return `${roomPrefix}-${year}${month}${day}-${number}`;
  }
  
  /**
   * Genera múltiples cartones para una sala
   */
  static generateBatch(room, count) {
    const cards = [];
    const serials = new Set();
    
    for (let i = 1; i <= count; i++) {
      let serial;
      do {
        serial = this.generateSerial(room, i + Math.floor(Math.random() * 1000));
      } while (serials.has(serial));
      
      serials.add(serial);
      
      const numbers = this.generateCard();
      cards.push({
        serial,
        room,
        numbers
      });
      
      // Log de progreso cada 100 cartones
      if (i % 100 === 0) {
        console.log(`✅ ${room}: ${i}/${count} cartones generados`);
      }
    }
    
    return cards;
  }
  
  /**
   * Valida que un cartón sea válido
   */
  static validateCard(card) {
    // Verificar dimensiones
    if (!Array.isArray(card) || card.length !== 3) return false;
    if (!card.every(row => Array.isArray(row) && row.length === 9)) return false;
    
    // Verificar que cada fila tenga exactamente 5 números
    for (const row of card) {
      const numbersInRow = row.filter(n => n !== null).length;
      if (numbersInRow !== 5) return false;
    }
    
    // Verificar que no haya números repetidos
    const allNumbers = card.flat().filter(n => n !== null);
    const uniqueNumbers = new Set(allNumbers);
    if (allNumbers.length !== uniqueNumbers.size) return false;
    
    // Verificar rangos por columna
    for (let col = 0; col < 9; col++) {
      const min = col === 0 ? 1 : col * 10;
      const max = col === 8 ? 90 : (col + 1) * 10 - 1;
      
      for (let row = 0; row < 3; row++) {
        const num = card[row][col];
        if (num !== null && (num < min || num > max)) {
          return false;
        }
      }
    }
    
    return true;
  }
}

module.exports = BingoCardGenerator;
