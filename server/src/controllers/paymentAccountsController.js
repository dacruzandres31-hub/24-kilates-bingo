const pool = require('../db');

/**
 * Controlador para la gestión de cuentas de pago (CBU/Alias) por Agente
 */
const paymentAccountsController = {

    // 1. Listar mis cuentas
    getMyAccounts: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const userRole = req.user.role;

            // Si es SuperAdmin, mostrar cuentas del SISTEMA (owner_id IS NULL)
            // Si es Agente, mostrar sus cuentas personales (owner_id = userId)
            let query, params;
            if (userRole === 'superadmin') {
                query = 'SELECT * FROM payment_accounts WHERE owner_id IS NULL ORDER BY priority_order DESC, created_at DESC';
                params = [];
            } else {
                query = 'SELECT * FROM payment_accounts WHERE owner_id = ? ORDER BY priority_order DESC, created_at DESC';
                params = [userId];
            }

            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error listing accounts:', error);
            res.status(500).json({ error: 'Error al obtener cuentas' });
        }
    },

    // 2. Crear nueva cuenta
    createAccount: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const userRole = req.user.role;
            const { alias, cbu, bank_name, holder_name, daily_limit } = req.body;

            if (!alias || !holder_name) {
                return res.status(400).json({ error: 'Alias y Titular son obligatorios' });
            }

            // Si es SuperAdmin, la cuenta es del SISTEMA (owner_id = NULL)
            // para rotación en VIP y ventas de cartones
            // Si es Agente, la cuenta es personal (owner_id = userId)
            const ownerId = userRole === 'superadmin' ? null : userId;

            const [result] = await pool.query(
                `INSERT INTO payment_accounts 
                (owner_id, alias, cbu, bank_name, holder_name, daily_limit, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
                [ownerId, alias, cbu || null, bank_name || 'MercadoPago', holder_name, daily_limit || 500000]
            );

            const accountType = userRole === 'superadmin' ? 'Sistema (VIP + Ventas)' : 'Personal';
            res.json({
                success: true,
                message: `Cuenta creada con éxito (Tipo: ${accountType})`,
                id: result.insertId,
                accountType
            });
        } catch (error) {
            console.error('Error creating account:', error);
            res.status(500).json({ error: 'Error al crear cuenta' });
        }
    },

    // 3. Editar cuenta
    updateAccount: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const userRole = req.user.role;
            const { id } = req.params;
            const { alias, cbu, bank_name, holder_name, daily_limit, is_active } = req.body;

            // Verificar propiedad
            let checkQuery, checkParams;
            if (userRole === 'superadmin') {
                // SuperAdmin puede editar cuentas del sistema (owner_id IS NULL)
                checkQuery = 'SELECT id FROM payment_accounts WHERE id = ? AND owner_id IS NULL';
                checkParams = [id];
            } else {
                // Agentes solo pueden editar sus propias cuentas
                checkQuery = 'SELECT id FROM payment_accounts WHERE id = ? AND owner_id = ?';
                checkParams = [id, userId];
            }

            const [check] = await pool.query(checkQuery, checkParams);
            if (check.length === 0) return res.status(403).json({ error: 'No tienes permiso o la cuenta no existe' });

            await pool.query(
                `UPDATE payment_accounts 
                 SET alias = ?, cbu = ?, bank_name = ?, holder_name = ?, daily_limit = ?, is_active = ?
                 WHERE id = ?`,
                [alias, cbu, bank_name, holder_name, daily_limit, is_active, id]
            );

            res.json({ success: true, message: 'Cuenta actualizada' });
        } catch (error) {
            console.error('Error updating account:', error);
            res.status(500).json({ error: 'Error al actualizar cuenta' });
        }
    },

    // 4. Eliminar cuenta
    deleteAccount: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const userRole = req.user.role;
            const { id } = req.params;

            // Verificar propiedad
            let checkQuery, checkParams;
            if (userRole === 'superadmin') {
                // SuperAdmin puede eliminar cuentas del sistema (owner_id IS NULL)
                checkQuery = 'SELECT id FROM payment_accounts WHERE id = ? AND owner_id IS NULL';
                checkParams = [id];
            } else {
                // Agentes solo pueden eliminar sus propias cuentas
                checkQuery = 'SELECT id FROM payment_accounts WHERE id = ? AND owner_id = ?';
                checkParams = [id, userId];
            }

            const [check] = await pool.query(checkQuery, checkParams);
            if (check.length === 0) return res.status(403).json({ error: 'No tienes permiso' });

            await pool.query('DELETE FROM payment_accounts WHERE id = ?', [id]);
            res.json({ success: true, message: 'Cuenta eliminada' });
        } catch (error) {
            console.error('Error deleting account:', error);
            res.status(500).json({ error: 'Error al eliminar cuenta' });
        }
    }
};

module.exports = paymentAccountsController;
