const pool = require('../db');
const MoneyMath = require('../utils/moneyMath');
const MembershipService = require('./membershipService');
const ReferralService = require('./referralService');

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
            throw new Error(ownerId
                ? 'No hay cuentas disponibles configuradas por tu superior para recibir depósitos. Por favor, contáctalo.'
                : 'No hay cuentas disponibles del sistema para recibir depósitos.');
        }

        return accounts[0];
    }

    // ============================================
    // CREAR SOLICITUD DE DEPÓSITO (ORDEN)
    // ============================================
    static async createDepositRequest(userId, accountId, amount, proofUrl, details = null, requestType = 'balance') {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const detailsJson = details ? JSON.stringify(details) : null;

            // 1. Obtener el dueño de la cuenta (target_user_id)
            const [accountRows] = await connection.query('SELECT owner_id FROM payment_accounts WHERE id = ? FOR UPDATE', [accountId]);
            const targetUserId = accountRows.length > 0 ? accountRows[0].owner_id : null;

            // 2. Crear la solicitud de depósito
            const [result] = await connection.query(`
                INSERT INTO deposit_requests 
                (user_id, account_id, amount_declared, proof_image_url, details, request_type, target_user_id, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
            `, [userId, accountId, amount, proofUrl, detailsJson, requestType, targetUserId]);

            // 3. Incrementar de inmediato el volumen diario de la cuenta bancaria
            if (accountId) {
                await connection.query(`
                UPDATE payment_accounts 
                SET current_daily_volume = current_daily_volume + ?
                WHERE id = ?
            `, [MoneyMath.toNumber(amount), accountId]);
                console.log(`[DepositService] 📈 Volumen de cuenta ${accountId} incrementado por aviso de $${amount}`);
            }

            await connection.commit();

            return {
                depositId: result.insertId,
                message: 'Orden de compra creada exitosamente'
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ============================================
    // APROBAR DEPÓSITO (CAJERO)
    // ============================================
    static async approveDeposit(depositId, reviewerId, io = null) {
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
                `SELECT balance, role FROM users WHERE id = ? FOR UPDATE`,
                [deposit.user_id]
            );

            if (users.length === 0) throw new Error('Usuario solicitante no encontrado');

            const balanceBefore = MoneyMath.decimal(users[0].balance);
            let balanceAfter;
            if (deposit.request_type === 'b2b_stock' || deposit.request_type === 'card_purchase') {
                // --- CASO B2B STOCK / COMPRA CARTONES: Acreditar cartones ---
                const details = typeof deposit.details === 'string' ? JSON.parse(deposit.details) : deposit.details;

                // Normalizar ítems
                const itemsToCredit = details.items && Array.isArray(details.items)
                    ? details.items
                    : (details.room ? [{ room: details.room, quantity: details.quantity }] : []);

                if (itemsToCredit.length === 0) throw new Error('Detalles de stock inválidos en la solicitud');

                // -----------------------------------------------------
                // VALIDAR Y DESCONTAR STOCK DEL VENDEDOR (Si existe y no es SuperAdmin)
                // -----------------------------------------------------
                if (deposit.target_user_id) {
                    const [sellerRows] = await connection.query('SELECT role FROM users WHERE id = ?', [deposit.target_user_id]);
                    if (sellerRows.length > 0 && sellerRows[0].role !== 'superadmin') {
                        // Verificar stock para cada ITEM
                        for (const item of itemsToCredit) {
                            const { room, quantity } = item;
                            const [inventory] = await connection.query(
                                `SELECT quantity FROM user_card_inventory WHERE user_id = ? AND room = ? AND is_gift = FALSE FOR UPDATE`,
                                [deposit.target_user_id, room]
                            );

                            const currentStock = inventory.length > 0 ? inventory[0].quantity : 0;
                            if (currentStock < quantity) {
                                throw new Error('INSUFFICIENT_SELLER_STOCK');
                            }

                            // Descontar
                            await connection.query(
                                `UPDATE user_card_inventory SET quantity = quantity - ? WHERE user_id = ? AND room = ? AND is_gift = FALSE`,
                                [quantity, deposit.target_user_id, room]
                            );

                            // Log de Venta (SALE)
                            await connection.query(`
                                INSERT INTO card_movements_log 
                                (user_id, from_user_id, to_user_id, room, quantity, movement_type, is_gift, executed_by)
                                VALUES (?, ?, ?, ?, ?, 'sale', FALSE, ?)
                            `, [deposit.target_user_id, deposit.target_user_id, deposit.user_id, room, quantity, reviewerId]);
                        }
                    }
                }

                for (const item of itemsToCredit) {
                    const { room, quantity } = item;
                    if (!room || !quantity) continue;

                    // Acreditar al inventario del usuario (Cartones Normales)
                    await connection.query(
                        `INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) 
                         VALUES (?, ?, ?, FALSE) 
                         ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
                        [deposit.user_id, room, quantity, quantity]
                    );

                    // Registrar movimiento de cartones (NORMAL)
                    await connection.query(`
                        INSERT INTO card_movements_log 
                        (user_id, from_user_id, to_user_id, room, quantity, movement_type, is_gift, executed_by)
                        VALUES (?, ?, ?, ?, ?, ?, FALSE, ?)
                    `, [deposit.user_id, reviewerId, deposit.user_id, room, quantity,
                    deposit.request_type === 'card_purchase' ? 'purchase' : 'b2b_purchase', reviewerId]);

                    // --- BONO DEL 10% PARA AGENTES Y ADMINISTRADORES ---
                    const userRole = users[0].role;
                    if (userRole === 'agente' || userRole === 'admin') {
                        const bonusQuantity = Math.floor(quantity * 0.1);
                        if (bonusQuantity > 0) {
                            // Acreditar al inventario del usuario (REGALO)
                            await connection.query(
                                `INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) 
                                 VALUES (?, ?, ?, TRUE) 
                                 ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
                                [deposit.user_id, room, bonusQuantity, bonusQuantity]
                            );

                            // Registrar movimiento de cartones (REGALO)
                            await connection.query(`
                                INSERT INTO card_movements_log 
                                (user_id, from_user_id, to_user_id, room, quantity, movement_type, is_gift, executed_by)
                                VALUES (?, ?, ?, ?, ?, 'purchase_bonus', TRUE, ?)
                            `, [deposit.user_id, reviewerId, deposit.user_id, room, bonusQuantity, reviewerId]);
                        }
                    }
                }

                balanceAfter = balanceBefore; // No cambia el balance de plata
                await connection.query(
                    `UPDATE users SET balance = ? WHERE id = ?`,
                    [MoneyMath.toNumber(balanceAfter), deposit.user_id]
                );
            }
            // --- CASO 3: COMPRA DE MEMBRESÍA (Membership Purchase) ---
            else if (deposit.request_type === 'membership_purchase') {
                const details = typeof deposit.details === 'string' ? JSON.parse(deposit.details) : deposit.details;
                if (!details || !details.membershipId) {
                    throw new Error('Detalles de membresía inválidos en la solicitud');
                }

                // Activar membresía SIN descontar saldo (ya pagó por transferencia)
                // Usamos MembershipService pero necesitamos pasarlo o requerirlo. (Added require at top)
                // NOTA: MembershipService usa su propia conexión/transacción.
                // Para consistencia transaccional ideal, MembershipService debería aceptar una conexión externa,
                // Pero por simplicidad en MVP, y dado que `activateSubscription` es robusto, lo llamaremos post-commit o asumimos riesgo bajo.
                // MEJOR OPCIÓN: Copiar lógica o refactorizar service. 
                // Dado el tiempo, ejecutaremos la lógica de activación AQUÍ dentro de la transacción actual.

                // --- ACTIVACIÓN IN-LINE ---
                const membershipId = details.membershipId;

                // 1. Validar Plan
                const [plans] = await connection.query('SELECT * FROM memberships WHERE id = ?', [membershipId]);
                if (plans.length === 0) throw new Error('Plan de membresía no encontrado');
                const plan = plans[0];
                const config = typeof plan.benefits_config === 'string' ? JSON.parse(plan.benefits_config) : plan.benefits_config;

                // 2. Desactivar anterior si existe
                if (users[0].subscription_tier_id) {
                    await connection.query("UPDATE user_subscriptions SET status = 'replaced' WHERE user_id = ? AND status = 'active'", [deposit.user_id]);
                }

                // 3. Crear Subscripción
                const nextBilling = new Date();
                nextBilling.setMonth(nextBilling.getMonth() + 1);

                await connection.query(`
                    INSERT INTO user_subscriptions 
                    (user_id, membership_id, status, start_date, next_billing_date, auto_renew)
                    VALUES (?, ?, 'active', NOW(), ?, true)
                `, [deposit.user_id, membershipId, nextBilling]);

                // 4. Actualizar Usuario (Beneficios)
                const monthlyCards = config.monthly_free_cards || 0;
                const dailySpins = config.wheel_daily_spins || 0;

                await connection.query(`
                    UPDATE users 
                    SET 
                      subscription_tier_id = ?,
                      monthly_free_cards_balance = ?,
                      daily_wheel_spins_balance = ?,
                      last_benefit_reset = NOW()
                    WHERE id = ?
                `, [membershipId, monthlyCards, dailySpins, deposit.user_id]);

                balanceAfter = balanceBefore; // El dinero fue para la membresía, no al saldo
            }
            else {
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

            // 4. (Omitido aquí) El volumen diario de la cuenta bancaria ya fue actualizado al crear el aviso.

            // 5. Marcar solicitud como Aprobada
            await connection.query(`
                UPDATE deposit_requests 
                SET status = 'approved', 
                reviewed_by = ?, 
                updated_at = NOW()
            WHERE id = ?
            `, [reviewerId, depositId]);

            await connection.commit();

            // -----------------------------------------------------
            // NOTIFICACIONES REAL-TIME (SOCKET.IO)
            // -----------------------------------------------------
            if (io) {
                // 1. Notificar al Comprador (para que se le actualice Stock o Chips)
                io.to(`user_${deposit.user_id}`).emit('resources_updated', {
                    trigger: 'deposit_approved',
                    type: deposit.request_type,
                    amount: MoneyMath.toNumber(amount)
                });

                // 2. Notificar al Vendedor (si existe, para que se le descuente Stock)
                if (deposit.target_user_id) {
                    io.to(`user_${deposit.target_user_id}`).emit('resources_updated', {
                        trigger: 'stock_sold',
                        type: 'sale',
                        to: deposit.user_id
                    });
                }
            }

            // -----------------------------------------------------
            // PROCESAR RECOMPENSA POR REFERIDO (Si aplica)
            // -----------------------------------------------------
            // Solo premiamos si el depósito fue para 'balance' (fichas) o 'membership_purchase'
            if (deposit.request_type === 'balance' || deposit.request_type === 'membership_purchase') {
                try {
                    // No bloqueamos la respuesta principal si falla el premio
                    ReferralService.processFirstDepositReward(deposit.user_id, MoneyMath.toNumber(amount))
                        .then(res => {
                            if (res.rewarded && io) {
                                // Notificar al referente de su bono en tiempo real
                                io.emit('referral_reward_credited', {
                                    referred_id: deposit.user_id,
                                    amount: res.amount
                                });
                            }
                        })
                        .catch(err => console.error('Referral Reward async error:', err));
                } catch (referralErr) {
                    console.error('⚠️ Error al intentar procesar recompensa de referido:', referralErr.message);
                }
            }

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
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Obtener datos del depósito para saber cuánto descontar y de qué cuenta
            const [rows] = await connection.query(
                `SELECT account_id, amount_declared, status FROM deposit_requests WHERE id = ? FOR UPDATE`,
                [depositId]
            );

            if (rows.length === 0) throw new Error('Solicitud no encontrada');
            const deposit = rows[0];

            if (deposit.status !== 'pending' && deposit.status !== 'approved') {
                // Si ya fue rechazado no hacemos nada raro. 
                // Pero si fue aprobado y queremos "desaprobar/rechazar", también debería descontar.
            }

            // 2. Marcar solicitud como Rechazada
            await connection.query(`
                UPDATE deposit_requests 
                SET status = 'rejected', 
                reviewed_by = ?, 
                admin_notes = ?,
                updated_at = NOW()
            WHERE id = ?
            `, [reviewerId, reason, depositId]);

            // 3. Descontar del volumen diario de la cuenta bancaria (Dada la instrucción del usuario)
            if (deposit.account_id) {
                await connection.query(`
                UPDATE payment_accounts 
                SET current_daily_volume = GREATEST(0, current_daily_volume - ?)
                WHERE id = ?
            `, [MoneyMath.toNumber(deposit.amount_declared), deposit.account_id]);
                console.log(`[DepositService] 📉 Volumen de cuenta ${deposit.account_id} decrementado por rechazo de $${deposit.amount_declared}`);
            }

            await connection.commit();
            return { success: true, message: 'Solicitud rechazada y volumen corregido' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ============================================
    // LISTAR PENDIENTES (ADMIN)
    // ============================================
    static async getPendingDeposits(adminId, role) {
        let query = `
            SELECT 
                dr.*,
                u.username,
                u.role,
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
