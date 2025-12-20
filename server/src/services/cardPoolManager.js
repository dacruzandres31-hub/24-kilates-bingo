/**
 * CARD POOL MANAGER
 * 
 * Gestiona la regeneración automática de cartones disponibles
 * - Regenera 1000 cartones cuando quedan menos de 200
 * - Limpia cartones no usados al iniciar sorteo
 * - Opera sala por sala
 */

const pool = require('../db');

class CardPoolManager {
  constructor() {
    this.MIN_THRESHOLD = 200; // Umbral mínimo de cartones disponibles
    this.BATCH_SIZE = 1000;   // Cantidad de cartones a generar por lote
    this.isGenerating = new Map(); // room -> boolean (evitar generación concurrente)
  }

  /**
   * Genera un cartón aleatorio de bingo (3 filas x 5 columnas)
   * @returns {Array} Matriz 3x5 con números del cartón
   */
  generateBingoCard() {
    const card = [];
    const ranges = [
      [1, 15],   // Columna B
      [16, 30],  // Columna I
      [31, 45],  // Columna N
      [46, 60],  // Columna G
      [61, 75]   // Columna O
    ];

    // Generar 3 filas
    for (let row = 0; row < 3; row++) {
      const cardRow = [];
      
      // Generar 5 columnas
      for (let col = 0; col < 5; col++) {
        const [min, max] = ranges[col];
        const usedInColumn = card
          .map(r => r[col])
          .filter(n => n !== undefined);
        
        let number;
        do {
          number = Math.floor(Math.random() * (max - min + 1)) + min;
        } while (usedInColumn.includes(number));
        
        cardRow.push(number);
      }
      
      card.push(cardRow);
    }

    return card;
  }

  /**
   * Genera un serial único para el cartón
   * Formato: ROOM-TIMESTAMP-RANDOM
   * @param {string} room - Nombre de la sala
   * @returns {string} Serial único
   */
  generateSerial(room) {
    const roomPrefix = {
      'free_starter': 'STR',
      'bronce': 'BRO',
      'plata': 'PLA',
      'oro': 'ORO'
    };
    
    const prefix = roomPrefix[room] || 'XXX';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return `${prefix}-${timestamp}-${random}`;
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
      
      const cardsToInsert = [];
      
      for (let i = 0; i < quantity; i++) {
        const cardData = this.generateBingoCard();
        const serial = this.generateSerial(room);
        
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
          `('${card.room}', '${card.serial}', '${card.data}', 'available')`
        ).join(',');
        
        await pool.query(`
          INSERT INTO bingo_cards_pool (room, serial, card_data, status) 
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
    const rooms = ['free_starter', 'bronce', 'plata', 'oro'];
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
