
const pool = require('../db');
const MoneyMath = require('../utils/moneyMath');

class DepositService {

    // ============================================
    // OBTENER CUENTA DISPONIBLE (ROTATOR)
    // ============================================
    static async getActiveAccount(ownerId = null) {
        // Estrategia: Obtener la cuenta con MENOR volumen diario acumulado
        // del superior (ownerId) que esté activa y no haya superado su límite.
        // Si ownerId es null, se buscan cuentas del sistema (SuperAdmin).
        const [accounts] = await pool.query(`
            SELECT id, alias, cbu, bank_name, holder_name
            FROM payment_accounts
            WHERE is_active = TRUE
            AND current_daily_volume < daily_limit
            AND ${ownerId ? 'owner_id = ?' : 'owner_id IS NULL'}
            ORDER BY current_daily_volume ASC
            LIMIT 1
        `, ownerId ? [ownerId] : []);

        if (accounts.length === 0) {
            throw new Error('No hay cuentas disponibles configuradas por tu superior para recibir depósitos.');
        }

        return accounts[0];
    }

    // ============================================
    // CREAR SOLICITUD DE DEPÓSITO (ORDEN)
    // ============================================
    static async createDepositRequest(userId, accountId, amount, proofUrl, details = null) {
        const detailsJson = details ? JSON.stringify(details) : null;

        const [result] = await pool.query(`
            INSERT INTO deposit_requests 
            (user_id, account_id, amount_declared, proof_image_url, details, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'pending', NOW())
        `, [userId, accountId, amount, proofUrl, detailsJson]);

        return {
            depositId: result.insertId,
            message: 'Orden de compra creada exitosamente'
        };
    }

    // ============================================
    // APROBAR DEPÓSITO (CAJERO)
    // ============================================
    static async approveDeposit(depositId, reviewerId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Obtener datos del depósito y verificar estado
            const [rows] = await connection.query(
                `SELECT * FROM deposit_requests WHERE id = ? FOR UPDATE`,
                [depositId]
            );

            if (rows.length === 0) throw new Error('Solicitud no encontrada');
            const deposit = rows[0];

            if (deposit.status !== 'pending') {
                throw new Error(`La solicitud ya está en estado: ${deposit.status}`);
            }

            const amount = MoneyMath.decimal(deposit.amount_declared);

            // 2. Acreditar fichas al usuario
            const [users] = await connection.query(
                `SELECT balance FROM users WHERE id = ? FOR UPDATE`,
                [deposit.user_id]
            );

            if (users.length === 0) throw new Error('Usuario solicitante no encontrado');

            const balanceBefore = MoneyMath.decimal(users[0].balance);
            if (deposit.request_type === 'b2b_stock') {
                // --- CASO B2B STOCK: Acreditar cartones ---
                const details = typeof deposit.details === 'string' ? JSON.parse(deposit.details) : deposit.details;

                // Normalizar ítems
                const itemsToCredit = details.items && Array.isArray(details.items)
                    ? details.items
                    : (details.room ? [{ room: details.room, quantity: details.quantity }] : []);

                if (itemsToCredit.length === 0) throw new Error('Detalles de stock inválidos en la solicitud');

                for (const item of itemsToCredit) {
                    const { room, quantity } = item;
                    if (!room || !quantity) continue;

                    // Acreditar al inventario del usuario
                    await connection.query(
                        `INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) 
                         VALUES (?, ?, ?, FALSE) 
                         ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
                        [deposit.user_id, room, quantity, quantity]
                    );

                    // Registrar movimiento de cartones
                    await connection.query(`
                        INSERT INTO card_movements_log 
                        (user_id, from_user_id, to_user_id, room, quantity, movement_type, is_gift, executed_by)
                        VALUES (?, ?, ?, ?, ?, 'b2b_purchase', FALSE, ?)
                    `, [deposit.user_id, reviewerId, deposit.user_id, room, quantity, reviewerId]);
                }

                balanceAfter = balanceBefore; // No cambia el balance de plata
            } else {
                // --- CASO NORMAL: Acreditar balance de dinero ---
                balanceAfter = balanceBefore.plus(amount);

                await connection.query(
                    `UPDATE users SET balance = ? WHERE id = ?`,
                    [MoneyMath.toNumber(balanceAfter), deposit.user_id]
                );
            }

            // 3. Registrar Log de Chips
            await connection.query(`
                INSERT INTO chips_movements 
                (user_id, movement_type, amount, balance_before, balance_after, reason, metadata, created_at)
                VALUES (?, 'deposit', ?, ?, ?, ?, ?, NOW())
            `, [
                deposit.user_id,
                MoneyMath.toNumber(amount),
                MoneyMath.toNumber(balanceBefore),
                MoneyMath.toNumber(balanceAfter),
                `Depósito/Stock Aprobado #${depositId}`,
                JSON.stringify({
                    deposit_id: depositId,
                    request_type: deposit.request_type,
                    reviewed_by: reviewerId,
                    account_id: deposit.account_id
                })
            ]);

            // 4. Actualizar volumen diario de la cuenta bancaria
            if (deposit.account_id) {
                await connection.query(`
                    UPDATE payment_accounts 
                    SET current_daily_volume = current_daily_volume + ?
                    WHERE id = ?
                `, [MoneyMath.toNumber(amount), deposit.account_id]);
            }

            // 5. Marcar solicitud como Aprobada
            await connection.query(`
                UPDATE deposit_requests 
                SET status = 'approved', 
                    reviewed_by = ?, 
                    updated_at = NOW()
                WHERE id = ?
            `, [reviewerId, depositId]);

            await connection.commit();

            return {
                success: true,
                newBalance: MoneyMath.toNumber(balanceAfter)
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ============================================
    // RECHAZAR DEPÓSITO
    // ============================================
    static async rejectDeposit(depositId, reviewerId, reason) {
        await pool.query(`
            UPDATE deposit_requests 
            SET status = 'rejected', 
                reviewed_by = ?, 
                admin_notes = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [reviewerId, reason, depositId]);

        return { success: true, message: 'Solicitud rechazada' };
    }

    // ============================================
    // LISTAR PENDIENTES (ADMIN)
    // ============================================
    static async getPendingDeposits(adminId, role) {
        let query = `
            SELECT 
                dr.*,
                u.username,
                pa.alias as account_alias,
                pa.bank_name
            FROM deposit_requests dr
            JOIN users u ON dr.user_id = u.id
            LEFT JOIN payment_accounts pa ON dr.account_id = pa.id
            WHERE dr.status = 'pending'
        `;
        const params = [];

        if (role !== 'superadmin') {
            // Un agente solo ve solicitudes de stock dirigidas a él
            query += " AND dr.target_user_id = ?";
            params.push(adminId);
        }

        query += " ORDER BY dr.created_at ASC";

        const [rows] = await pool.query(query, params);
        return rows;
    }
}

module.exports = DepositService;
