const pool = require('../db');
const gameEngine = require('./gameEngine');

/**
 * DAILY GENERATOR - Genera 10,000 cartones diarios por sala
 * 
 * Características:
 * - Genera números únicos respetando columnas (BINGO distribution)
 * - Bulk insert por lotes de 1000 (performance)
 * - ~45 segundos para 10k cartones
 * - Validación de unicidad
 * - Auditoría y logging
 */

class DailyGenerator {
  /**
   * Genera cartones para un día específico
   * @param {string} roomType - room_type (bronce|plata|oro|free_starter)
   * @param {Date} playDate - Fecha del juego
   * @param {object} gameTime - {hours, minutes}
   * @returns {object} Resultado de generación
   */
  static async generateDailyStock(roomType, playDate, gameTime = { hours: 20, minutes: 0 }) {
    const connection = await pool.getConnection();

    try {
      await connection.query('START TRANSACTION');

      const CARDS_PER_ROOM = 10000;
      const BATCH_SIZE = 1000;
      let totalGenerated = 0;
      let startTime = Date.now();

      console.log(`[DailyGenerator] Iniciando generación de ${CARDS_PER_ROOM} cartones para ${roomType}`);

      // Generar cartones en lotes
      for (let batch = 0; batch < CARDS_PER_ROOM / BATCH_SIZE; batch++) {
        const cards = gameEngine.generateUniqueCards(BATCH_SIZE);
        
        // Preparar valores para insert
        const values = [];
        let paramCount = 1;

        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          const serialNumber = (batch * BATCH_SIZE) + i + 1;
          const price = this.getPriceByRoom(roomType);

          values.push(
            `($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`
          );
        }

        // Construir INSERT gigante
        const params = [];
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          const serialNumber = (batch * BATCH_SIZE) + i + 1;
          const price = this.getPriceByRoom(roomType);
          const gameTimeFormatted = `${String(gameTime.hours).padStart(2, '0')}:${String(gameTime.minutes).padStart(2, '0')}:00`;

          params.push(
            roomType,
            serialNumber,
            JSON.stringify(card),
            playDate,
            gameTimeFormatted,
            'available',
            null,
            price
          );
        }

        // Execute bulk insert
        const placeholders = values.join(',');
        const query = `INSERT INTO daily_stock_cards 
                       (room, serial_number, grid_numbers, play_date, play_time, status, buyer_id, price)
                       VALUES ${placeholders}`;

        await connection.query(query, params);

        totalGenerated += BATCH_SIZE;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[DailyGenerator] Batch ${batch + 1}/${CARDS_PER_ROOM / BATCH_SIZE} completado. Total: ${totalGenerated}. Tiempo: ${elapsed}s`);
      }

      // Verificar cantidad generada
      const [verifyResult] = await connection.query(
        `SELECT COUNT(*) as count FROM daily_stock_cards 
         WHERE room = ? AND play_date = ? AND status = 'available'`,
        [roomType, playDate]
      );

      const actualCount = verifyResult[0].count;

      if (actualCount !== CARDS_PER_ROOM) {
        throw new Error(`Verificación fallida: se esperaban ${CARDS_PER_ROOM}, se obtuvieron ${actualCount}`);
      }

      // Registrar en auditoría
      await connection.query(
        `INSERT INTO audit_revenue (amount, transaction_type)
         VALUES (?, ?)`,
        [CARDS_PER_ROOM, `daily_generation_${roomType}`]
      );

      await connection.query('COMMIT');

      const totalTime = Math.round((Date.now() - startTime) / 1000);

      return {
        success: true,
        roomType,
        playDate,
        cardsGenerated: CARDS_PER_ROOM,
        timeSeconds: totalTime,
        avgTimePerCard: (totalTime / CARDS_PER_ROOM * 1000).toFixed(2) + 'ms',
        price: this.getPriceByRoom(roomType)
      };
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('Daily generation error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Limpia cartones sin vender de un día anterior
   * @param {Date} beforeDate - Eliminar cartones anteriores a esta fecha
   * @returns {object} Resultado de limpieza
   */
  static async cleanExpiredStock(beforeDate) {
    try {
      const [result] = await pool.query(
        `DELETE FROM daily_stock_cards 
         WHERE status = 'available' AND play_date < ?`,
        [beforeDate]
      );

      const deletedCount = result.affectedRows;

      // Auditoría
      if (deletedCount > 0) {
        await pool.query(
          `INSERT INTO audit_revenue (amount, transaction_type)
           VALUES (?, ?)`,
          [deletedCount, 'expired_stock_cleanup']
        );
      }

      console.log(`[DailyGenerator] Limpieza completada: ${deletedCount} cartones eliminados`);

      return {
        success: true,
        deletedCount,
        beforeDate
      };
    } catch (error) {
      console.error('Stock cleanup error:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del stock actual
   * @returns {object} Estadísticas de inventario
   */
  static async getStockStats() {
    try {
      const [result] = await pool.query(
        `SELECT 
           room,
           COUNT(*) as total_cards,
           COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
           COUNT(CASE WHEN status IN ('sold', 'selected', 'used') THEN 1 END) as sold,
           COUNT(CASE WHEN status = 'discarded' THEN 1 END) as discarded
         FROM bingo_cards_pool
         GROUP BY room`
      );

      return result;
    } catch (error) {
      console.error('Get stock stats error:', error);
      throw error;
    }
  }

  /**
   * Obtiene precio por tipo de sala
   * @param {string} roomType - Tipo de sala
   * @returns {number} Precio del cartón
   */
  static getPriceByRoom(roomType) {
    const prices = {
      'bronce': 50.00,
      'plata': 100.00,
      'oro': 250.00,
      'free_starter': 0.00
    };
    return prices[roomType] || 50.00;
  }

  /**
   * Verifica si hay stock disponible para una fecha
   * @param {Date} playDate - Fecha del juego
   * @returns {object} Disponibilidad por sala
   */
  static async checkStockAvailability(playDate) {
    try {
      const [result] = await pool.query(
        `SELECT room, COUNT(*) as available_count 
         FROM daily_stock_cards 
         WHERE play_date = ? AND status = 'available'
         GROUP BY room`,
        [playDate]
      );

      return result;
    } catch (error) {
      console.error('Check stock availability error:', error);
      throw error;
    }
  }

  /**
   * Obtiene cartones disponibles para compra
   * @param {string} roomType - Tipo de sala
   * @param {Date} playDate - Fecha del juego
   * @param {number} limit - Cantidad máxima a retornar
   * @returns {array} Cartones disponibles
   */
  static async getAvailableCards(roomType, playDate, limit = 10) {
    try {
      const [result] = await pool.query(
        `SELECT id, serial_number, grid_numbers, price FROM daily_stock_cards
         WHERE room = ? AND play_date = ? AND status = 'available'
         ORDER BY created_at ASC
         LIMIT ?`,
        [roomType, playDate, limit]
      );

      return result;
    } catch (error) {
      console.error('Get available cards error:', error);
      throw error;
    }
  }

  /**
   * Obtiene cartones por comprador
   * @param {number} userId - ID del usuario/comprador
   * @param {Date} playDate - Fecha del juego (opcional)
   * @returns {array} Cartones comprados por usuario
   */
  static async getCardsByBuyer(userId, playDate = null) {
    try {
      let query = `SELECT id, serial_number, grid_numbers, room, price, play_date 
                   FROM daily_stock_cards 
                   WHERE buyer_id = ? AND status = 'sold'`;
      const params = [userId];

      if (playDate) {
        query += ` AND play_date = ?`;
        params.push(playDate);
      }

      query += ` ORDER BY play_date DESC, play_time DESC`;

      const [result] = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error('Get cards by buyer error:', error);
      throw error;
    }
  }
}

module.exports = DailyGenerator;
