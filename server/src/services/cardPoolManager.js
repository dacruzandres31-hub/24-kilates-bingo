/**
 * CARD POOL MANAGER
 * 
 * Gestiona la regeneración automática de cartones disponibles
 * - Regenera 1000 cartones cuando quedan menos de 200
 * - Limpia cartones no usados al iniciar sorteo
 * - Opera sala por sala
 */

const pool = require('../db');
const BingoCardGenerator = require('../utils/cardGenerator');

class CardPoolManager {
  constructor() {
    this.MIN_THRESHOLD = 200; // Umbral mínimo de cartones disponibles
    this.BATCH_SIZE = 1000;   // Cantidad de cartones a generar por lote
    this.isGenerating = new Map(); // room -> boolean (evitar generación concurrente)
  }

  /**
   * Genera un cartón aleatorio de bingo (3 filas x 9 columnas)
   * Cada fila tiene 5 números y 4 espacios vacíos (null)
   * @returns {Array} Matriz 3x9 con números del cartón
   */
  generateBingoCard() {
    return BingoCardGenerator.generateCard();
  }

  /**
   * Genera un serial único para el cartón
   * Formato: SALA-YYYYMMDD-NNNNNNNN-L (8 dígitos + letra A-Z)
   * Ejemplo: STA-20251220-00000454-A
   * Capacidad: 26 series × 100M = 2,600 millones de cartones por sala
   * @param {string} room - Nombre de la sala
   * @param {number} index - Índice secuencial del cartón
   * @param {number} startFrom - Número inicial para continuar secuencia
   * @returns {string} Serial único
   */
  generateSerial(room, index, startFrom = 0) {
    const roomPrefix = {
      'starter': 'STA',
      'bronce': 'BRO',
      'plata': 'PLA',
      'oro': 'ORO'
    };
    
    const prefix = roomPrefix[room] || 'XXX';
    
    // Fecha en formato YYYYMMDD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Número total global (para calcular letra y número)
    const totalNumber = startFrom + index;
    
    // Calcular letra (A-Z): cada 100M cartones cambia la letra
    const letterIndex = Math.floor(totalNumber / 100000000);
    const letter = String.fromCharCode(65 + (letterIndex % 26)); // 65 = 'A'
    
    // Número secuencial de 8 dígitos dentro de la serie actual
    const sequential = String(totalNumber % 100000000).padStart(8, '0');
    
    return `${prefix}-${dateStr}-${sequential}-${letter}`;
  }

  /**
   * Obtiene el último número serial usado para una sala (sin importar la fecha)
   * Esto garantiza numeración continua sin reinicio entre días
   * Parsea formato: SALA-YYYYMMDD-NNNNNNNN-L
   * @param {string} room - Nombre de la sala
   * @returns {Promise<number>} Último número secuencial global usado
   */
  async getLastSerialNumber(room) {
    const roomPrefix = {
      'starter': 'STA',
      'bronce': 'BRO',
      'plata': 'PLA',
      'oro': 'ORO'
    };
    
    const prefix = roomPrefix[room] || 'XXX';
    
    // Buscar el último serial de esta sala sin importar la fecha
    const pattern = `${prefix}-%`;
    
    const [rows] = await pool.query(`
      SELECT card_serial 
      FROM bingo_cards_pool 
      WHERE card_serial LIKE ?
      ORDER BY card_serial DESC 
      LIMIT 1
    `, [pattern]);
    
    if (rows.length === 0) {
      return 0; // No hay cartones previos, empezar desde 0
    }
    
    // Extraer número y letra del serial: SALA-YYYYMMDD-NNNNNNNN-L
    const lastSerial = rows[0].card_serial;
    const parts = lastSerial.split('-');
    const numberPart = parseInt(parts[2], 10);
    const letterPart = parts[3] || 'A'; // Si no tiene letra, asumir 'A'
    
    // Calcular número global: (letra × 100M) + número
    const letterIndex = letterPart.charCodeAt(0) - 65; // 'A' = 0, 'B' = 1, etc.
    const globalNumber = (letterIndex * 100000000) + numberPart;
    
    return globalNumber + 1; // Retornar el siguiente número para continuar la secuencia
  }

  /**
   * Verifica cuántos cartones disponibles hay en una sala
   * @param {string} room - Nombre de la sala
   * @returns {Promise<number>} Cantidad de cartones disponibles
   */
  async checkAvailableCards(room) {
    const [result] = await pool.query(`
      SELECT COUNT(*) as available 
      FROM bingo_cards_pool 
      WHERE room = ? 
      AND status = 'available'
    `, [room]);
    
    return result[0]?.available || 0;
  }

  /**
   * Genera un lote de cartones para una sala
   * @param {string} room - Nombre de la sala
   * @param {number} quantity - Cantidad de cartones a generar
   * @returns {Promise<number>} Cantidad de cartones generados
   */
  async generateCardsForRoom(room, quantity = this.BATCH_SIZE) {
    // Evitar generación concurrente para la misma sala
    if (this.isGenerating.get(room)) {
      console.log(`[CardPoolManager] ⚠️ Ya hay una generación en curso para sala ${room}`);
      return 0;
    }

    this.isGenerating.set(room, true);

    try {
      console.log(`[CardPoolManager] 🎫 Generando ${quantity} cartones para sala ${room}...`);
      
      // Obtener el último número serial usado para continuar la secuencia
      const startFrom = await this.getLastSerialNumber(room);
      console.log(`[CardPoolManager] 📍 Continuando numeración desde: ${startFrom}`);
      
      const cardsToInsert = [];
      
      for (let i = 0; i < quantity; i++) {
        const cardData = this.generateBingoCard();
        const serial = this.generateSerial(room, i, startFrom);
        
        cardsToInsert.push({
          room,
          serial,
          data: JSON.stringify(cardData)
        });
      }

      // Insertar en lotes de 100 para evitar timeout
      const CHUNK_SIZE = 100;
      let totalInserted = 0;

      for (let i = 0; i < cardsToInsert.length; i += CHUNK_SIZE) {
        const chunk = cardsToInsert.slice(i, i + CHUNK_SIZE);
        
        const values = chunk.map(card => 
          `('${card.serial}', '${card.room}', '${card.data}', 'available')`
        ).join(',');
        
        await pool.query(`
          INSERT INTO bingo_cards_pool (card_serial, room, numbers, status) 
          VALUES ${values}
        `);
        
        totalInserted += chunk.length;
      }

      console.log(`[CardPoolManager] ✅ ${totalInserted} cartones generados para sala ${room}`);
      return totalInserted;

    } catch (error) {
      console.error(`[CardPoolManager] ❌ Error generando cartones para sala ${room}:`, error);
      throw error;
    } finally {
      this.isGenerating.set(room, false);
    }
  }

  /**
   * Verifica y regenera cartones si es necesario (después de cada compra)
   * @param {string} room - Nombre de la sala
   * @returns {Promise<boolean>} true si se regeneró, false si no fue necesario
   */
  async checkAndRegenerate(room) {
    const available = await this.checkAvailableCards(room);
    
    if (available < this.MIN_THRESHOLD) {
      console.log(`[CardPoolManager] ⚠️ Sala ${room} con solo ${available} cartones disponibles (umbral: ${this.MIN_THRESHOLD})`);
      await this.generateCardsForRoom(room);
      return true;
    }
    
    return false;
  }

  /**
   * Limpia cartones no usados y regenera 1000 nuevos (al iniciar sorteo)
   * @param {string} room - Nombre de la sala
   * @returns {Promise<object>} Resultado de la operación
   */
  async cleanAndRegenerateForSession(room) {
    try {
      console.log(`[CardPoolManager] 🧹 Limpiando cartones no usados de sala ${room}...`);
      
      // 1. Eliminar cartones disponibles (no vendidos)
      const [deleteResult] = await pool.query(`
        DELETE FROM bingo_cards_pool 
        WHERE room = ? 
        AND status = 'available'
      `, [room]);
      
      const cardsDeleted = deleteResult.affectedRows || 0;
      console.log(`[CardPoolManager] 🗑️ ${cardsDeleted} cartones no usados eliminados`);

      // 2. Generar 1000 cartones nuevos para la próxima sesión
      const cardsGenerated = await this.generateCardsForRoom(room, this.BATCH_SIZE);

      return {
        success: true,
        cardsDeleted,
        cardsGenerated,
        room
      };

    } catch (error) {
      console.error(`[CardPoolManager] ❌ Error en cleanAndRegenerate para sala ${room}:`, error);
      throw error;
    }
  }

  /**
   * Inicializa cartones para todas las salas (al iniciar servidor)
   * @returns {Promise<object>} Resultado de la inicialización
   */
  async initializeAllRooms() {
    const rooms = ['starter', 'bronce', 'plata', 'oro'];
    const results = {};

    for (const room of rooms) {
      try {
        const available = await this.checkAvailableCards(room);
        
        if (available < this.BATCH_SIZE) {
          console.log(`[CardPoolManager] 🔄 Sala ${room} necesita inicialización (tiene ${available})`);
          const generated = await this.generateCardsForRoom(room);
          results[room] = { status: 'generated', available, generated };
        } else {
          console.log(`[CardPoolManager] ✅ Sala ${room} ya tiene ${available} cartones disponibles`);
          results[room] = { status: 'ok', available };
        }
      } catch (error) {
        console.error(`[CardPoolManager] ❌ Error inicializando sala ${room}:`, error);
        results[room] = { status: 'error', error: error.message };
      }
    }

    return results;
  }
}

// Singleton
const cardPoolManager = new CardPoolManager();

module.exports = cardPoolManager;
