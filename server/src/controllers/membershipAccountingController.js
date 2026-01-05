const dbHelper = require('../helpers/dbHelper');
const responseHelper = require('../helpers/responseHelper');

// Helper para asegurar que el resultado de una query sea siempre un array
function ensureArray(result) {
  if (!result) return [];
  // Si es un array de arrays (formato mysql2 [rows, fields])
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }
  // Si es un array normal
  if (Array.isArray(result)) {
    return result;
  }
  // Si es un objeto único
  return [result];
}

/**
 * GET /api/admin/memberships/accounting
 * Retorna métricas financieras y estadísticas de membresías para Andy
 */
async function getMembershipAccounting(req, res) {
  try {
    // Solo Andy puede ver este panel
    if (req.user.username?.toLowerCase() !== 'andy') {
      return responseHelper.error(res, 403, 'Acceso denegado');
    }

    console.log('✅ Usuario autenticado:', req.user.username);

    // 1. Obtener todas las suscripciones activas con detalles
    const activeSubsResult = await dbHelper.query(`
      SELECT us.*, m.name as plan_name, m.price, u.username
      FROM user_subscriptions us
      JOIN memberships m ON us.membership_id = m.id
      JOIN users u ON us.user_id = u.id
      WHERE us.status = 'active'
    `);
    const activeSubs = ensureArray(activeSubsResult);

    // 2. Calcular estadísticas por tier
    const tierStats = {
      embajador: { count: 0, revenue: 0, price: 0 },
      bronce: { count: 0, revenue: 0, price: 0 },
      plata: { count: 0, revenue: 0, price: 0 },
      oro: { count: 0, revenue: 0, price: 0 }
    };

    let totalActive = 0;
    let totalMRR = 0;

    activeSubs.forEach(sub => {
      const planName = (sub.plan_name || '').toLowerCase();
      const price = parseFloat(sub.price) || 0;
      
      totalActive++;
      totalMRR += price;

      if (planName.includes('embajador')) {
        tierStats.embajador.count++;
        tierStats.embajador.revenue += price;
        tierStats.embajador.price = price;
      } else if (planName.includes('oro')) {
        tierStats.oro.count++;
        tierStats.oro.revenue += price;
        tierStats.oro.price = price;
      } else if (planName.includes('plata')) {
        tierStats.plata.count++;
        tierStats.plata.revenue += price;
        tierStats.plata.price = price;
      } else if (planName.includes('bronce')) {
        tierStats.bronce.count++;
        tierStats.bronce.revenue += price;
        tierStats.bronce.price = price;
      }
    });

    // 3. Obtener solicitudes pendientes
    const pendingResult = await dbHelper.query(`
      SELECT dr.*, u.username, 
             JSON_EXTRACT(dr.details, '$.membershipId') as membership_id,
             m.name as plan_name, m.price
      FROM deposit_requests dr
      JOIN users u ON dr.user_id = u.id
      LEFT JOIN memberships m ON JSON_EXTRACT(dr.details, '$.membershipId') = m.id
      WHERE dr.request_type = 'membership_purchase' AND dr.status = 'pending'
      ORDER BY dr.created_at DESC
    `);
    const pendingRequests = ensureArray(pendingResult);

    const pendingCount = pendingRequests.length;
    const pendingValue = pendingRequests.reduce((sum, req) => sum + parseFloat(req.amount_declared || 0), 0);

    // 4. Obtener ingresos del mes actual (solicitudes aprobadas este mes)
    const monthlyApprovedResult = await dbHelper.query(`
      SELECT SUM(amount_declared) as total
      FROM deposit_requests
      WHERE request_type = 'membership_purchase'
        AND status = 'approved'
        AND MONTH(updated_at) = MONTH(CURRENT_DATE())
        AND YEAR(updated_at) = YEAR(CURRENT_DATE())
    `);
    const monthlyApproved = ensureArray(monthlyApprovedResult);
    const currentMonthRevenue = parseFloat(monthlyApproved[0]?.total || 0);

    // 5. Próximas renovaciones (próximos 7 días)
    const renewalsResult = await dbHelper.query(`
      SELECT us.*, m.name as plan_name, m.price, u.username
      FROM user_subscriptions us
      JOIN memberships m ON us.membership_id = m.id
      JOIN users u ON us.user_id = u.id
      WHERE us.status = 'active'
        AND us.auto_renew = 1
        AND us.next_billing_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
      ORDER BY us.next_billing_date ASC
    `);
    const upcomingRenewals = ensureArray(renewalsResult);

    // 6. Historial mensual (últimos 6 meses)
    const historyResult = await dbHelper.query(`
      SELECT 
        DATE_FORMAT(updated_at, '%Y-%m') as month,
        SUM(amount_declared) as revenue,
        COUNT(*) as count
      FROM deposit_requests
      WHERE request_type = 'membership_purchase'
        AND status = 'approved'
        AND updated_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(updated_at, '%Y-%m')
      ORDER BY month DESC
    `);
    const monthlyHistory = ensureArray(historyResult);

    // 7. Lista de todas las suscripciones activas para el tab "Suscripciones"
    const activeSubscriptions = activeSubs.map(sub => ({
      id: sub.id,
      userId: sub.user_id,
      username: sub.username,
      planName: sub.plan_name,
      price: parseFloat(sub.price),
      startDate: sub.start_date,
      nextBillingDate: sub.next_billing_date,
      autoRenew: sub.auto_renew
    }));

    return responseHelper.success(res, {
      financialSummary: {
        currentMonthRevenue,
        mrr: totalMRR,
        revenueByTier: {
          embajador: tierStats.embajador,
          bronce: tierStats.bronce,
          plata: tierStats.plata,
          oro: tierStats.oro
        }
      },
      subscriptionStats: {
        totalActive,
        byTier: {
          embajador: tierStats.embajador.count,
          bronce: tierStats.bronce.count,
          plata: tierStats.plata.count,
          oro: tierStats.oro.count
        },
        upcomingRenewals: upcomingRenewals.map(r => ({
          username: r.username,
          planName: r.plan_name,
          price: parseFloat(r.price),
          renewalDate: r.next_billing_date
        })),
        activeSubscriptions
      },
      pendingApprovals: {
        count: pendingCount,
        totalValue: pendingValue,
        requests: pendingRequests.map(req => ({
          id: req.id,
          username: req.username,
          planName: req.plan_name || 'Membresía',
          amountDeclared: parseFloat(req.amount_declared),
          createdAt: req.created_at
        }))
      },
      historical: {
        monthlyRevenue: monthlyHistory.map(h => ({
          month: h.month,
          revenue: parseFloat(h.revenue || 0),
          count: h.count || 0
        })),
        renewalRate: totalActive > 0 ? Math.round(activeSubs.filter(s => s.auto_renew).length / totalActive * 100) : 0
      }
    });

  } catch (error) {
    console.error('❌ Error en getMembershipAccounting:', error);
    console.error('Stack:', error.stack);
    return responseHelper.error(res, 500, 'Error obteniendo contabilidad de membresías', error.message);
  }
}

module.exports = getMembershipAccounting;
