const pool = require('../db');

/**
 * STOCK MANAGER - Gestión de Inventario de Cartones
 * 
 * Responsabilidades:
 * - Limpiar cartones sin vender (unsold cleanup)
 * - Bloquear ventas a las T-5 minutos
 * - Liberar ventas después de partida finalizada
 * - Regenerar stock para día siguiente
 * - Reportes de inventario
 * - Análisis de tendencias
 */

class StockManager {
  /**
   * Limpia cartones no vendidos para una fecha
   * @param {Date} playDate - Fecha a limpiar
   * @param {string} roomType - (opcional) solo sala específica
   * @returns {object} Resultado de limpieza
   */
  static async cleanUnsoldStock(playDate, roomType = null) {
    // NOTA: El sistema actual usa bingo_cards_pool que es un pool permanente,
    // no daily_stock_cards. La limpieza la hace CardPoolManager al iniciar el sorteo.
    // Esta función es un no-op silencioso para evitar errores.
    console.log(`[StockManager] cleanUnsoldStock: Delegado a CardPoolManager`);
    return {
      success: true,
      discardedCount: 0,
      playDate,
      roomType: roomType || 'todas',
      note: 'CardPoolManager handles cleanup'
    };
  }

  /**
   * Bloquea ventas de cartones (T-5 minutes antes de partida)
   * NOTA: El sistema actual cierra ventas via frontend (salesOpen endpoint).
   * Esta función es un no-op silencioso.
   */
  static async blockSales(playDate, roomType = null) {
    // El bloqueo de ventas se maneja en el frontend verificando si hay sesión active
    // y si faltan menos de 5 minutos. Esta función es legacy.
    console.log(`[StockManager] blockSales: Ventas controladas via frontend`);
    return {
      success: true,
      blockedCount: 0,
      playDate,
      reason: 'T-5 closure handled by frontend salesOpen check'
    };
  }

  /**
   * Libera ventas después de partida (para preventas)
   * @param {string} roomType - Sala a liberar
   * @param {Date} afterDate - Liberar solo después de esta fecha
   * @returns {object} Resultado
   */
  static async releaseSales(roomType, afterDate = null) {
    try {
      let query = `UPDATE daily_stock_cards 
                   SET status = 'available', updated_at = NOW()
                   WHERE room = ? AND status = 'discarded'`;
      const params = [roomType];

      if (afterDate) {
        query += ` AND play_date > ?`;
        params.push(afterDate);
      }

      const [result] = await pool.query(query, params);
      const releasedCount = result.affectedRows;

      console.log(`[StockManager] Ventas liberadas: ${releasedCount} cartones para ${roomType}`);

      return {
        success: true,
        releasedCount,
        roomType
      };
    } catch (error) {
      console.error('Release sales error:', error);
      throw error;
    }
  }

  /**
   * Genera stock para el día siguiente
   * @param {Date} targetDate - Fecha para generar stock
   * @param {string} roomType - (opcional) solo sala específica
   * @returns {object} Resultado
   */
  static async generateNextDayStock(targetDate, roomType = null) {
    try {
      // Solo usar el dailyGenerator para esto, aquí solo coordinamos
      const message = `[StockManager] Stock para ${targetDate} será generado por scheduler`;

      console.log(message);

      return {
        success: true,
        targetDate,
        message,
        provider: 'dailyGenerator'
      };
    } catch (error) {
      console.error('Generate next day stock error:', error);
      throw error;
    }
  }

  /**
   * Obtiene estado actual del stock
   * @param {string} roomType - Sala a verificar
   * @param {Date} playDate - Fecha a verificar (no usado, legacy)
   * @returns {object} Estado detallado
   */
  static async getStockStatus(roomType = null, playDate = null) {
    try {
      // NOTA: El sistema actual usa bingo_cards_pool con columna 'room'
      let query = `SELECT room, 
                          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                          SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
                          SUM(CASE WHEN status = 'discarded' THEN 1 ELSE 0 END) as discarded,
                          COUNT(*) as total
                   FROM bingo_cards_pool
                   WHERE 1=1`;
      const params = [];

      if (roomType) {
        query += ` AND room = ?`;
        params.push(roomType);
      }

      query += ` GROUP BY room`;

      const [result] = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error('Get stock status error:', error);
      throw error;
    }
  }

  /**
   * Obtiene reporte de ventas por sala
   * @param {Date} fromDate - Fecha inicial
   * @param {Date} toDate - Fecha final
   * @returns {array} Reporte de ventas
   */
  static async getSalesReport(fromDate, toDate) {
    try {
      // NOTA: El sistema actual usa bingo_cards_pool con columna 'room'
      const [result] = await pool.query(
        `SELECT room,
                COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_count,
                COUNT(*) as total_count,
                DATE(updated_at) as play_date
         FROM bingo_cards_pool
         WHERE updated_at >= ? AND updated_at <= ?
         GROUP BY room, DATE(updated_at)
         ORDER BY play_date DESC, room`,
        [fromDate, toDate]
      );

      return result;
    } catch (error) {
      console.error('Get sales report error:', error);
      return []; // Retornar vacío en lugar de fallar
    }
  }

  /**
   * Obtiene top compradores
   * @param {number} limit - Cantidad máxima
   * @param {Date} fromDate - Fecha inicial (opcional)
   * @returns {array} Top compradores
   */
  static async getTopBuyers(limit = 10, fromDate = null) {
    try {
      let query = `SELECT user_id as buyer_id, 
                          COUNT(*) as cards_bought,
                          GROUP_CONCAT(DISTINCT room SEPARATOR ',') as rooms
                   FROM bingo_cards_pool
                   WHERE status = 'sold' AND user_id IS NOT NULL`;
      const params = [];

      if (fromDate) {
        query += ` AND updated_at >= ?`;
        params.push(fromDate);
      }

      query += ` GROUP BY user_id
                 ORDER BY cards_bought DESC
                 LIMIT ?`;
      params.push(limit);

      const [result] = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error('Get top buyers error:', error);
      throw error;
    }
  }

  /**
   * Obtiene análisis de conversión (sold vs generated)
   * @returns {object} Tasa de conversión por sala
   */
  static async getConversionAnalytics() {
    try {
      const [result] = await pool.query(
        `SELECT room,
                COUNT(*) as total_generated,
                COUNT(CASE WHEN status = 'sold' THEN 1 END) as total_sold,
                ROUND(100.0 * COUNT(CASE WHEN status = 'sold' THEN 1 END) / COUNT(*), 2) as conversion_rate,
                COUNT(CASE WHEN status = 'available' THEN 1 END) as still_available,
                COUNT(CASE WHEN status = 'discarded' THEN 1 END) as total_discarded
         FROM daily_stock_cards
         GROUP BY room`
      );

      return result;
    } catch (error) {
      console.error('Get conversion analytics error:', error);
      throw error;
    }
  }

  /**
   * Proyecta revenue futuro basado en histórico
   * @param {number} daysAhead - Días a proyectar hacia adelante
   * @returns {object} Proyección
   */
  static async projectRevenue(daysAhead = 30) {
    try {
      const [result] = await pool.query(
        `WITH daily_revenue AS (
           SELECT DATE(play_date) as play_date,
                  SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END) as daily_revenue
           FROM daily_stock_cards
           GROUP BY DATE(play_date)
         )
         SELECT AVG(daily_revenue) as avg_daily_revenue,
                MIN(daily_revenue) as min_daily,
                MAX(daily_revenue) as max_daily,
                STDDEV_POP(daily_revenue) as std_dev,
                AVG(daily_revenue) * ? as projected_30days
         FROM daily_revenue`,
        [daysAhead]
      );

      return result[0];
    } catch (error) {
      console.error('Project revenue error:', error);
      throw error;
    }
  }

  /**
   * Obtiene cartones a punto de expirar
   * @param {number} hoursUntilExpire - Horas hasta que expiren
   * @returns {array} Cartones próximos a expirar
   */
  static async getExpiringCards(hoursUntilExpire = 24) {
    try {
      const result = await pool.query(
        `SELECT room, COUNT(*) as expiring_count, play_date
         FROM daily_stock_cards
         WHERE status = 'available'
           AND play_date < (CURRENT_DATE + INTERVAL '${hoursUntilExpire} hours')
           AND play_date >= CURRENT_DATE
         GROUP BY room, play_date
         ORDER BY play_date ASC`
      );

      return result.rows;
    } catch (error) {
      console.error('Get expiring cards error:', error);
      throw error;
    }
  }
}

module.exports = StockManager;
