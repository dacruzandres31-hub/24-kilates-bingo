const pool = require('../db');

/**
 * POST /api/admin/activate-ambassador
 * Activa la membresía Socio Embajador para un agente
 * Costo: $5,000 COP
 */
async function activateAmbassador(req, res) {
    try {
        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;

        // Solo agentes pueden activar esta membresía
        if (userRole !== 'agente') {
            return res.status(403).json({
                success: false,
                message: 'Solo los agentes pueden activar la membresía Socio Embajador'
            });
        }

        // Verificar si ya es ambassador
        const [userCheck] = await pool.query(
            'SELECT is_ambassador, balance FROM users WHERE id = ?',
            [userId]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = userCheck[0];

        if (user.is_ambassador) {
            return res.status(400).json({
                success: false,
                message: 'Ya tienes la membresía Socio Embajador activa'
            });
        }

        // Verificar saldo suficiente
        const MEMBERSHIP_COST = 5000;
        if (user.balance < MEMBERSHIP_COST) {
            return res.status(400).json({
                success: false,
                message: `Saldo insuficiente. Necesitas $${MEMBERSHIP_COST.toLocaleString()} COP. Tu saldo actual: $${user.balance.toLocaleString()} COP`
            });
        }

        // Iniciar transacción
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Deducir saldo
            await connection.query(
                'UPDATE users SET balance = balance - ?, is_ambassador = TRUE WHERE id = ?',
                [MEMBERSHIP_COST, userId]
            );

            // 2. Registrar movimiento
            await connection.query(
                `INSERT INTO chips_movements 
                (user_id, movement_type, amount, balance_after, reason, created_at)
                VALUES (?, 'membership_purchase', ?, ?, 'Activación Membresía Socio Embajador', NOW())`,
                [userId, -MEMBERSHIP_COST, user.balance - MEMBERSHIP_COST]
            );

            // 3. Registrar en audit log
            await connection.query(
                `INSERT INTO audit_logs 
                (user_id, action, details, created_at)
                VALUES (?, 'ambassador_activated', ?, NOW())`,
                [userId, JSON.stringify({ cost: MEMBERSHIP_COST, previous_balance: user.balance })]
            );

            await connection.commit();
            connection.release();

            return res.json({
                success: true,
                message: 'Membresía Socio Embajador activada exitosamente',
                data: {
                    new_balance: user.balance - MEMBERSHIP_COST,
                    cost: MEMBERSHIP_COST,
                    is_ambassador: true
                }
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Error activating ambassador:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al activar la membresía',
            error: error.message
        });
    }
}

module.exports = {
    activateAmbassador
};
