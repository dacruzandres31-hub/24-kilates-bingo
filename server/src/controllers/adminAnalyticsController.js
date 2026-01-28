const pool = require('../db');

/**
 * Controlador de Analíticas para el Dashboard Admin
 * Provee datos reales de producción para gráficos y estadísticas
 */

/**
 * GET /api/admin/analytics/monthly-netwin
 * Retorna datos de ganancias vs gastos de los últimos 12 meses
 */
exports.getMonthlyNetwin = async (req, res) => {
    try {
        const query = `
      SELECT 
        DATE_FORMAT(created_at, '%b-%y') as fecha,
        YEAR(created_at) as year,
        MONTH(created_at) as month,
        COALESCE(SUM(CASE 
          WHEN movement_type IN ('purchase', 'deposit') 
          THEN ABS(amount) 
          ELSE 0 
        END), 0) as ganancia,
        COALESCE(SUM(CASE 
          WHEN movement_type IN ('prize', 'withdrawal', 'bonus', 'refund') 
          THEN ABS(amount) 
          ELSE 0 
        END), 0) as gasto
      FROM chips_movements
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY year ASC, month ASC
      LIMIT 12
    `;

        const [rows] = await pool.query(query);

        // Si no hay datos, retornar array vacío
        if (!rows || rows.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Formatear datos para el frontend
        const formattedData = rows.map(row => ({
            fecha: row.fecha,
            ganancia: parseFloat(row.ganancia) || 0,
            gasto: parseFloat(row.gasto) || 0
        }));

        res.json({
            success: true,
            data: formattedData
        });

    } catch (error) {
        console.error('Error fetching monthly netwin:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos mensuales'
        });
    }
};

/**
 * GET /api/admin/analytics/daily-netwin
 * Retorna datos de ganancias vs gastos de las últimas 24 horas (por hora)
 */
exports.getDailyNetwin = async (req, res) => {
    try {
        const query = `
      SELECT 
        LPAD(hora, 2, '0') as hora,
        COALESCE(SUM(ganancia), 0) as ganancia,
        COALESCE(SUM(gasto), 0) as gasto
      FROM (
        SELECT 
          HOUR(created_at) as hora,
          CASE 
            WHEN movement_type IN ('purchase', 'deposit') 
            THEN ABS(amount) 
            ELSE 0 
          END as ganancia,
          CASE 
            WHEN movement_type IN ('prize', 'withdrawal', 'bonus', 'refund') 
            THEN ABS(amount) 
            ELSE 0 
          END as gasto
        FROM chips_movements
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ) subq
      GROUP BY hora
      ORDER BY hora ASC
    `;

        const [rows] = await pool.query(query);

        // Si no hay datos, retornar array vacío
        if (!rows || rows.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Formatear datos para el frontend
        const formattedData = rows.map(row => ({
            hora: row.hora,
            ganancia: parseFloat(row.ganancia) || 0,
            gasto: parseFloat(row.gasto) || 0
        }));

        res.json({
            success: true,
            data: formattedData
        });

    } catch (error) {
        console.error('Error fetching daily netwin:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos diarios'
        });
    }
};

/**
 * GET /api/admin/analytics/top-agents
 * Retorna top 5 agentes del mes por volumen de ventas
 */
exports.getTopAgents = async (req, res) => {
    try {
        // Primero obtener el total de ventas del mes
        const [totalRows] = await pool.query(`
      SELECT COALESCE(SUM(ABS(amount)), 0) as total
      FROM chips_movements
      WHERE movement_type = 'purchase'
        AND MONTH(created_at) = MONTH(NOW())
        AND YEAR(created_at) = YEAR(NOW())
    `);

        const totalSales = parseFloat(totalRows[0]?.total) || 0;

        // Si no hay ventas, retornar array vacío
        if (totalSales === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Obtener top agentes con sus ventas
        const query = `
      SELECT 
        u.id,
        u.username as name,
        COALESCE(SUM(ABS(cm.amount)), 0) as total_sales
      FROM users u
      LEFT JOIN chips_movements cm ON (
        cm.created_by = u.id 
        AND cm.movement_type IN ('deposit', 'purchase')
        AND MONTH(cm.created_at) = MONTH(NOW())
        AND YEAR(cm.created_at) = YEAR(NOW())
      )
      WHERE u.role = 'agente'
      GROUP BY u.id, u.username
      HAVING total_sales > 0
      ORDER BY total_sales DESC
      LIMIT 5
    `;

        const [rows] = await pool.query(query);

        // Si no hay agentes con ventas, retornar array vacío
        if (!rows || rows.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Paleta de colores para los agentes
        const AGENT_COLORS = ['#ec4899', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

        // Formatear datos para el frontend
        const formattedData = rows.map((row, index) => {
            const salesAmount = parseFloat(row.total_sales) || 0;
            const percentage = totalSales > 0 ? (salesAmount / totalSales * 100) : 0;

            return {
                name: row.name,
                value: parseFloat(percentage.toFixed(2)),
                color: AGENT_COLORS[index % AGENT_COLORS.length],
                totalSales: salesAmount
            };
        });

        res.json({
            success: true,
            data: formattedData
        });

    } catch (error) {
        console.error('Error fetching top agents:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener top agentes'
        });
    }
};

/**
 * GET /api/admin/analytics/net-profit-comparison
 * Retorna comparación de ganancia neta entre mes actual y mes anterior
 */
exports.getNetProfitComparison = async (req, res) => {
    try {
        // Obtener datos del mes actual
        const [currentMonthRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN movement_type IN ('purchase', 'deposit') 
          THEN ABS(amount) 
          ELSE 0 
        END), 0) as ganancia,
        COALESCE(SUM(CASE 
          WHEN movement_type IN ('prize', 'withdrawal', 'bonus', 'refund') 
          THEN ABS(amount) 
          ELSE 0 
        END), 0) as gasto
      FROM chips_movements
      WHERE MONTH(created_at) = MONTH(NOW())
        AND YEAR(created_at) = YEAR(NOW())
    `);

        // Obtener datos del mes anterior
        const [previousMonthRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN movement_type IN ('purchase', 'deposit') 
          THEN ABS(amount) 
          ELSE 0 
        END), 0) as ganancia,
        COALESCE(SUM(CASE 
          WHEN movement_type IN ('prize', 'withdrawal', 'bonus', 'refund') 
          THEN ABS(amount) 
          ELSE 0 
        END), 0) as gasto
      FROM chips_movements
      WHERE MONTH(created_at) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
        AND YEAR(created_at) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
    `);

        const currentMonth = currentMonthRows[0] || { ganancia: 0, gasto: 0 };
        const previousMonth = previousMonthRows[0] || { ganancia: 0, gasto: 0 };

        const currentNet = parseFloat(currentMonth.ganancia) - parseFloat(currentMonth.gasto);
        const previousNet = parseFloat(previousMonth.ganancia) - parseFloat(previousMonth.gasto);

        // Calcular porcentaje de cambio
        let percentageChange = 0;
        if (previousNet !== 0) {
            percentageChange = ((currentNet - previousNet) / Math.abs(previousNet)) * 100;
        } else if (currentNet > 0) {
            percentageChange = 100; // Si no había ganancia anterior y ahora hay, es 100% de incremento
        }

        res.json({
            success: true,
            data: {
                currentMonth: {
                    ganancia: parseFloat(currentMonth.ganancia) || 0,
                    gasto: parseFloat(currentMonth.gasto) || 0,
                    neto: currentNet
                },
                previousMonth: {
                    ganancia: parseFloat(previousMonth.ganancia) || 0,
                    gasto: parseFloat(previousMonth.gasto) || 0,
                    neto: previousNet
                },
                percentageChange: parseFloat(percentageChange.toFixed(2))
            }
        });

    } catch (error) {
        console.error('Error fetching net profit comparison:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener comparación de ganancia neta'
        });
    }
};
