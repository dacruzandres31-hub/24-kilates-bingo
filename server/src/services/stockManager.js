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
    try {
      let query = `UPDATE daily_stock_cards 
                   SET status = 'discarded', updated_at = NOW()
                   WHERE play_date = ? AND status = 'available'`;
      const params = [playDate];

      if (roomType) {
        query += ` AND room = ?`;
        params.push(roomType);
      }

      const [result] = await pool.query(query, params);
      const discardedCount = result.affectedRows;

      // Auditoría
      await pool.query(
        `INSERT INTO audit_revenue (amount, transaction_type)
         VALUES (?, ?)`,
        [discardedCount, `stock_cleanup_${playDate}`]
      );

      console.log(`[StockManager] Limpieza: ${discardedCount} cartones descartados para ${playDate}`);

      return {
        success: true,
        discardedCount,
        playDate,
        roomType: roomType || 'todas'
      };
    } catch (error) {
      console.error('Clean unsold stock error:', error);
      throw error;
    }
  }

  /**
   * Bloquea ventas de cartones (T-5 minutes antes de partida)
   * @param {Date} playDate - Fecha de la partida
   * @param {string} roomType - (opcional) solo sala específica
   * @returns {object} Resultado del bloqueo
   */
  static async blockSales(playDate, roomType = null) {
    try {
      let query = `UPDATE daily_stock_cards 
                   SET status = 'discarded', updated_at = NOW()
                   WHERE play_date = ? AND status = 'available'`;
      const params = [playDate];

      if (roomType) {
        query += ` AND room = ?`;
        params.push(roomType);
      }

      const [result] = await pool.query(query, params);
      const blockedCount = result.affectedRows;

      // Auditoría
      await pool.query(
        `INSERT INTO audit_revenue (amount, transaction_type)
         VALUES (?, ?)`,
        [blockedCount, `sales_blocked_${playDate}`]
      );

      console.log(`[StockManager] Bloqueo de ventas: ${blockedCount} cartones para ${playDate}`);

      return {
        success: true,
        blockedCount,
        playDate,
        reason: 'T-5 minutes to game start'
      };
    } catch (error) {
      console.error('Block sales error:', error);
      throw error;
    }
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
   * @param {Date} playDate - Fecha a verificar
   * @returns {object} Estado detallado
   */
  static async getStockStatus(roomType = null, playDate = null) {
    try {
      let query = `SELECT room, 
                          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                          SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
                          SUM(CASE WHEN status = 'discarded' THEN 1 ELSE 0 END) as discarded,
                          COUNT(*) as total
                   FROM daily_stock_cards
                   WHERE 1=1`;
      const params = [];

      if (roomType) {
        query += ` AND room = ?`;
        params.push(roomType);
      }

      if (playDate) {
        query += ` AND play_date = ?`;
        params.push(playDate);
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
      const [result] = await pool.query(
        `SELECT room,
                COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_count,
                SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END) as total_revenue,
                AVG(CASE WHEN status = 'sold' THEN price ELSE NULL END) as avg_price,
                DATE(play_date) as play_date
         FROM daily_stock_cards
         WHERE play_date >= ? AND play_date <= ?
         GROUP BY room, DATE(play_date)
         ORDER BY play_date DESC, room`,
        [fromDate, toDate]
      );

      return result;
    } catch (error) {
      console.error('Get sales report error:', error);
      throw error;
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
      let query = `SELECT buyer_id, 
                          COUNT(*) as cards_bought,
                          SUM(price) as total_spent,
                          AVG(price) as avg_price,
                          GROUP_CONCAT(DISTINCT room SEPARATOR ',') as rooms
                   FROM daily_stock_cards
                   WHERE status = 'sold' AND buyer_id IS NOT NULL`;
      const params = [];

      if (fromDate) {
        query += ` AND play_date >= ?`;
        params.push(fromDate);
      }

      query += ` GROUP BY buyer_id
                 ORDER BY total_spent DESC
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
