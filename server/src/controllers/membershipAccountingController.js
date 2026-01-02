const dbHelper = require('../helpers/dbHelper');
const responseHelper = require('../helpers/responseHelper');

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

    // Por ahora retornar datos de ejemplo para que el frontend funcione
    // Las tablas están creadas, solo falta que haya datos reales
    return responseHelper.success(res, {
      financialSummary: {
        currentMonthRevenue: 0,
        mrr: 0,
        revenueByTier: {
          bronce: { revenue: 0, count: 0, price: 5000 },
          plata: { revenue: 0, count: 0, price: 10000 },
          oro: { revenue: 0, count: 0, price: 20000 }
        }
      },
      subscriptionStats: {
        totalActive: 0,
        byTier: {
          bronce: 0,
          plata: 0,
          oro: 0
        },
        upcomingRenewals: []
      },
      pendingApprovals: {
        count: 0,
        totalValue: 0,
        requests: []
      },
      historical: {
        monthlyRevenue: [],
        renewalRate: 0
      }
    });

  } catch (error) {
    console.error('❌ Error en getMembershipAccounting:', error);
    console.error('Stack:', error.stack);
    return responseHelper.error(res, 500, 'Error obteniendo contabilidad de membresías', error.message);
  }
}

module.exports = getMembershipAccounting;
