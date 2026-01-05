// ============================================
// SERVICIO: CÁLCULO Y DISTRIBUCIÓN DE COMISIONES
// ============================================
// ⚠️ PUNTO CLAVE #2: Comisión del 15% a CADA cajero individualmente
// Este servicio calcula y acredita la comisión del 15% a cada cajero
// que vendió cartones en una sesión de juego

const pool = require('../db');
const MoneyMath = require('../utils/moneyMath');
const whatsapp24KService = require('./whatsapp24KService');

class CommissionService {

  // ============================================
  // CALCULAR COMISIONES POR SESIÓN
  // ============================================
  static async calculateSessionCommissions(sessionId) {
    const connection = await pool.getConnection();
    
    try {
      // Obtener todos los cartones vendidos en esta sesión
      const [cards] = await connection.query(
        `SELECT 
          bc.id as card_id,
          bc.card_price,
          bc.seller_id,
          u.username as seller_username,
          u.role as seller_role
        FROM bingo_cards bc
        LEFT JOIN users u ON bc.seller_id = u.id
        WHERE bc.session_id = ?`,
        [sessionId]
      );

      if (cards.length === 0) {
        return {
          sessionId,
          totalCards: 0,
          totalRevenue: 0,
          commissions: [],
          totalCommission: 0
        };
      }

      // Agrupar ventas por cajero
      const salesByCashier = {};
      let totalRevenue = MoneyMath.decimal(0);

      for (const card of cards) {
        const sellerId = card.seller_id;
        const price = MoneyMath.decimal(card.card_price);

        // Si el cartón fue vendido por un cajero
        if (sellerId && (card.seller_role === 'cajero' || card.seller_role === 'admin')) {
          if (!salesByCashier[sellerId]) {
            salesByCashier[sellerId] = {
              sellerId,
              username: card.seller_username,
              role: card.seller_role,
              cards: [],
              totalSales: MoneyMath.decimal(0)
            };
          }

          salesByCashier[sellerId].cards.push(card.card_id);
          salesByCashier[sellerId].totalSales = 
            salesByCashier[sellerId].totalSales.plus(price);
        }

        totalRevenue = totalRevenue.plus(price);
      }

      // Calcular comisión del 15% para CADA cajero
      const commissions = [];
      let totalCommission = MoneyMath.decimal(0);

      for (const [sellerId, data] of Object.entries(salesByCashier)) {
        const commission = MoneyMath.percentage(data.totalSales, 15); // 15% de sus ventas
        
        commissions.push({
          sellerId: parseInt(sellerId),
          username: data.username,
          role: data.role,
          cardsCount: data.cards.length,
          cardIds: data.cards,
          totalSales: MoneyMath.toNumber(data.totalSales),
          commissionPercent: 15,
          commissionAmount: MoneyMath.toNumber(commission)
        });

        totalCommission = totalCommission.plus(commission);
      }

      return {
        sessionId,
        totalCards: cards.length,
        totalRevenue: MoneyMath.toNumber(totalRevenue),
        commissions,
        totalCommission: MoneyMath.toNumber(totalCommission),
        timestamp: new Date()
      };

    } finally {
      connection.release();
    }
  }

  // ============================================
  // ACREDITAR COMISIONES A CAJEROS
  // ============================================
  static async creditCommissionsToCashiers(sessionId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.query('START TRANSACTION');

      // Calcular comisiones
      const commissionData = await this.calculateSessionCommissions(sessionId);

      if (commissionData.commissions.length === 0) {
        await connection.query('ROLLBACK');
        return {
          success: true,
          message: 'No hay comisiones para acreditar',
          data: commissionData
        };
      }

      const creditedCommissions = [];

      // Acreditar comisión a CADA cajero individualmente
      for (const commission of commissionData.commissions) {
        const { sellerId, commissionAmount, cardsCount, totalSales } = commission;

        // Obtener balance actual del cajero
        const [cashiers] = await connection.query(
          'SELECT balance FROM users WHERE id = ?',
          [sellerId]
        );

        if (cashiers.length === 0) {
          console.warn(`Cajero ${sellerId} no encontrado, saltando comisión`);
          continue;
        }

        const balanceBefore = MoneyMath.decimal(cashiers[0].balance);
        const balanceAfter = balanceBefore.plus(commissionAmount);

        // Acreditar fichas al cajero
        await connection.query(
          'UPDATE users SET balance = ? WHERE id = ?',
          [MoneyMath.toNumber(balanceAfter), sellerId]
        );

        // Registrar movimiento en chips_movements
        const [movementResult] = await connection.query(
          `INSERT INTO chips_movements 
          (user_id, movement_type, amount, balance_before, balance_after, 
           game_session_id, reason, metadata, created_at)
          VALUES (?, 'bonus', ?, ?, ?, ?, ?, ?, NOW())`,
          [
            sellerId,
            commissionAmount,
            MoneyMath.toNumber(balanceBefore),
            MoneyMath.toNumber(balanceAfter),
            sessionId,
            `Comisión 15% por venta de ${cardsCount} cartones en sesión ${sessionId}`,
            JSON.stringify({
              commission_percent: 15,
              cards_sold: cardsCount,
              total_sales: totalSales,
              session_id: sessionId
            })
          ]
        );

        creditedCommissions.push({
          sellerId,
          movementId: movementResult.insertId,
          commissionAmount,
          balanceBefore: MoneyMath.toNumber(balanceBefore),
          balanceAfter: MoneyMath.toNumber(balanceAfter)
        });

        // 🔔 Notificación WhatsApp de comisión ganada
        whatsapp24KService.notifyCommissionEarned(sellerId, {
          playerName: `Sesión #${sessionId}`,
          purchaseAmount: totalSales,
          commission: commissionAmount,
          newBalance: MoneyMath.toNumber(balanceAfter)
        }).catch(err => console.error('[WhatsApp] Error notificando comisión:', err));
      }

      await connection.query('COMMIT');

      return {
        success: true,
        sessionId,
        commissionsProcessed: creditedCommissions.length,
        totalCommissionPaid: commissionData.totalCommission,
        details: creditedCommissions
      };

    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('Error acreditando comisiones:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // OBTENER COMISIONES DE UN CAJERO
  // ============================================
  static async getCashierCommissions(cashierId, filters = {}) {
    const { startDate, endDate, limit = 100, offset = 0 } = filters;

    let query = `
      SELECT 
        cm.*,
        gs.id as session_id,
        gs.created_at as session_date
      FROM chips_movements cm
      LEFT JOIN game_sessions gs ON cm.game_session_id = gs.id
      WHERE cm.user_id = ? 
        AND cm.movement_type = 'bonus'
        AND cm.reason LIKE '%Comisión%'
    `;

    const params = [cashierId];

    if (startDate) {
      query += ' AND cm.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND cm.created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY cm.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [commissions] = await pool.query(query, params);

    // Calcular total
    const totalCommissions = commissions.reduce(
      (acc, c) => MoneyMath.add(acc, c.amount),
      MoneyMath.decimal(0)
    );

    return {
      cashierId,
      commissions,
      totalCommissions: MoneyMath.toNumber(totalCommissions),
      count: commissions.length
    };
  }

  // ============================================
  // REPORTE: TOP CAJEROS POR COMISIONES
  // ============================================
  static async getTopCashiersByCommissions(period = '30d', limit = 10) {
    let dateFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
    if (period === '7d') dateFilter = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
    if (period === '90d') dateFilter = 'DATE_SUB(NOW(), INTERVAL 90 DAY)';

    const [results] = await pool.query(
      `SELECT 
        u.id as cashier_id,
        u.username,
        u.role,
        COUNT(cm.id) as total_commissions,
        SUM(cm.amount) as total_earned,
        AVG(cm.amount) as avg_commission,
        MIN(cm.created_at) as first_commission,
        MAX(cm.created_at) as last_commission
      FROM users u
      INNER JOIN chips_movements cm ON u.id = cm.user_id
      WHERE cm.movement_type = 'bonus'
        AND cm.reason LIKE '%Comisión%'
        AND cm.created_at >= ${dateFilter}
      GROUP BY u.id, u.username, u.role
      ORDER BY total_earned DESC
      LIMIT ?`,
      [limit]
    );

    return results.map(r => ({
      ...r,
      total_earned: MoneyMath.toNumber(r.total_earned),
      avg_commission: MoneyMath.toNumber(r.avg_commission)
    }));
  }
}

module.exports = CommissionService;
