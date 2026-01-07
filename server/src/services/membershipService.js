const pool = require('../db');
const referralCommissionService = require('./referralCommissionService');

// ID de membresía Embajador
const EMBAJADOR_MEMBERSHIP_ID = 1;

class MembershipService {

    /**
     * Get all available membership tiers
     */
    async getAllMemberships() {
        const [rows] = await pool.query('SELECT * FROM memberships ORDER BY price ASC');
        return rows.map(row => ({
            ...row,
            benefits_config: typeof row.benefits_config === 'string'
                ? JSON.parse(row.benefits_config)
                : row.benefits_config
        }));
    }

    /**
     * Get ALL active subscription details for a user (can have Embajador + another)
     */
    async getUserSubscriptions(userId) {
        const query = `
      SELECT 
        us.*, 
        m.name as plan_name, 
        m.price, 
        m.benefits_config
      FROM user_subscriptions us
      JOIN memberships m ON us.membership_id = m.id
      WHERE us.user_id = ? AND us.status = 'active'
      ORDER BY m.price ASC
    `;

        const [rows] = await pool.query(query, [userId]);

        return rows.map(sub => {
            if (typeof sub.benefits_config === 'string') {
                sub.benefits_config = JSON.parse(sub.benefits_config);
            }
            return sub;
        });
    }

    /**
     * Get formatted subscription details for a user (legacy - returns main non-embajador sub)
     */
    async getUserSubscription(userId) {
        const query = `
      SELECT 
        us.*, 
        m.name as plan_name, 
        m.price, 
        m.benefits_config,
        u.monthly_free_cards_balance,
        u.daily_wheel_spins_balance,
        u.last_benefit_reset
      FROM user_subscriptions us
      JOIN memberships m ON us.membership_id = m.id
      JOIN users u ON us.user_id = u.id
      WHERE us.user_id = ? AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

        const [rows] = await pool.query(query, [userId]);

        if (rows.length === 0) return null;

        const sub = rows[0];
        // Parse config if string
        if (typeof sub.benefits_config === 'string') {
            sub.benefits_config = JSON.parse(sub.benefits_config);
        }

        return sub;
    }

    /**
     * Subscribe a user to a membership plan
     * Handles payment (balance deduction) and benefit initialization.
     */
    async subscribe(userId, membershipId) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1. Get Membership Details
            const [plans] = await connection.query('SELECT * FROM memberships WHERE id = ?', [membershipId]);
            if (plans.length === 0) throw new Error('Plan de membresía no encontrado');
            const plan = plans[0];
            const config = typeof plan.benefits_config === 'string' ? JSON.parse(plan.benefits_config) : plan.benefits_config;

            // 2. Get User Balance & Current Sub
            const [users] = await connection.query('SELECT id, balance, subscription_tier_id FROM users WHERE id = ? FOR UPDATE', [userId]);
            if (users.length === 0) throw new Error('Usuario no encontrado');
            const user = users[0];

            if (user.subscription_tier_id) {
                throw new Error('Ya tienes una membresía activa. Debes cancelarla o esperar a que venza para cambiar.');
            }

            if (parseFloat(user.balance) < parseFloat(plan.price)) {
                throw new Error(`Saldo insuficiente. Necesitas $${plan.price} y tienes $${user.balance}`);
            }

            // 3. Deduct Balance
            await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [plan.price, userId]);

            // 4. Create Subscription Record
            const nextBilling = new Date();
            nextBilling.setMonth(nextBilling.getMonth() + 1);

            await connection.query(`
        INSERT INTO user_subscriptions 
        (user_id, membership_id, status, start_date, next_billing_date, auto_renew)
        VALUES (?, ?, 'active', NOW(), ?, true)
      `, [userId, membershipId, nextBilling]);

            // 5. Update User Benefits
            // Initial benefits: Full monthly cards + Daily spins (1 day worth)
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
      `, [membershipId, monthlyCards, dailySpins, userId]);

            // 6. Record Transaction (Optional but good practice)
            // Assuming a transactions table exists, otherwise skip or add simple logging
            // await connection.query('INSERT INTO transactions ...') 

            // 7. Distribute commissions - solo aplica para Embajador
            await this.distributeMembershipCommissions(userId, plan.price, connection, membershipId);

            await connection.commit();

            return {
                success: true,
                message: `Te has suscrito exitosamente a ${plan.name}`,
                plan: plan
            };

        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Cancel subscription (turn off auto-renew)
     * Note: Benefits remain until expiration/billing date in a real system.
     * MVP: Just marks as cancelled, benefits might persist until manual cleanup or expiration check.
     */
    async cancelSubscription(userId) {
        const [result] = await pool.query(`
        UPDATE user_subscriptions 
        SET status = 'cancelled', auto_renew = false 
        WHERE user_id = ? AND status = 'active'
     `, [userId]);

        if (result.affectedRows === 0) {
            throw new Error('No tienes una suscripción activa para cancelar');
        }

        // IMPORTANT: Validar si queremos quitar beneficios inmediatamente o no.
        // Por ahora, solo cancelamos la renovación.
        return { success: true, message: 'Suscripción cancelada. No se renovará automáticamente.' };
    }

    /**
     * Activate Subscription Manually (e.g., after Bank Transfer Approval)
     * Skips balance check/deduction.
     */
    async activateSubscription(userId, membershipId) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1. Get Membership Details
            const [plans] = await connection.query('SELECT * FROM memberships WHERE id = ?', [membershipId]);
            if (plans.length === 0) throw new Error('Plan de membresía no encontrado');
            const plan = plans[0];
            const config = typeof plan.benefits_config === 'string' ? JSON.parse(plan.benefits_config) : plan.benefits_config;

            // 2. Validate User
            const [users] = await connection.query('SELECT id, subscription_tier_id FROM users WHERE id = ? FOR UPDATE', [userId]);
            if (users.length === 0) throw new Error('Usuario no encontrado');
            const user = users[0];

            if (user.subscription_tier_id) {
                // Determine if upgrading or overwriting. For MVP, we overwrite existing active sub.
                // Optionally could throw error if active, but "Purchase" implies replacing.
                // Let's mark old sub as completed/cancelled
                await connection.query("UPDATE user_subscriptions SET status = 'replaced' WHERE user_id = ? AND status = 'active'", [userId]);
            }

            // 3. Create Subscription Record (No balance deduction)
            const nextBilling = new Date();
            nextBilling.setMonth(nextBilling.getMonth() + 1);

            await connection.query(`
                INSERT INTO user_subscriptions 
                (user_id, membership_id, status, start_date, next_billing_date, auto_renew)
                VALUES (?, ?, 'active', NOW(), ?, true)
            `, [userId, membershipId, nextBilling]);

            // 4. Update User Benefits - Entregar cartones y spins del primer día
            const dailySpins = config.wheel_daily_spins || 0;
            const dailyBronzeCards = config.daily_bronze_cards || 0;
            const dailyOroCards = config.daily_oro_cards || 0;

            // Actualizar tier y resetear beneficios
            await connection.query(`
                UPDATE users 
                SET 
                  subscription_tier_id = ?,
                  daily_wheel_spins_balance = ?,
                  last_benefit_reset = NOW()
                WHERE id = ?
            `, [membershipId, dailySpins, userId]);

            // Entregar cartones del primer día según el tipo de membresía
            if (dailyBronzeCards > 0) {
                await connection.query(`
                    UPDATE users 
                    SET gift_cards_bronce = gift_cards_bronce + ?
                    WHERE id = ?
                `, [dailyBronzeCards, userId]);
                console.log(`🎁 [MEMBERSHIP_ACTIVATE] Delivered ${dailyBronzeCards} BRONCE cards to user ${userId}`);
            }

            if (dailyOroCards > 0) {
                await connection.query(`
                    UPDATE users 
                    SET gift_cards_oro = gift_cards_oro + ?
                    WHERE id = ?
                `, [dailyOroCards, userId]);
                console.log(`🏆 [MEMBERSHIP_ACTIVATE] Delivered ${dailyOroCards} ORO cards to user ${userId}`);
            }

            await connection.commit();

            // Distribute commissions - solo aplica para Embajador
            await this.distributeMembershipCommissions(userId, plan.price, connection, membershipId);

            return {
                success: true,
                message: `Membresía ${plan.name} activada exitosamente para el usuario.`,
                plan: plan
            };

        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    async getPendingPurchases(userId) {
        // Return ALL pending membership purchases for this user
        const [rows] = await pool.query(`
            SELECT id, details, created_at 
            FROM deposit_requests 
            WHERE user_id = ? 
            AND status = 'pending' 
            AND request_type = 'membership_purchase'
            ORDER BY created_at DESC
        `, [userId]);
        return rows; // Return array of all pending requests
    }

    /**
     * Reset daily benefits (e.g. Wheel Spins)
     * To be called by cron job every midnight
     */
    async resetDailyBenefits() {
        console.log('🔄 Running Daily Membership Benefit Reset...');

        const [tiers] = await pool.query('SELECT id, name, benefits_config FROM memberships');

        for (const tier of tiers) {
            const config = typeof tier.benefits_config === 'string' ? JSON.parse(tier.benefits_config) : tier.benefits_config;
            const dailySpins = config.wheel_daily_spins || 0;
            const dailyBronzeCards = config.daily_bronze_cards || 0;
            const dailyOroCards = config.daily_oro_cards || 0;

            // Resetear ruedas diarias
            if (dailySpins > 0) {
                await pool.query(`
                  UPDATE users 
                  SET daily_wheel_spins_balance = ? 
                  WHERE subscription_tier_id = ?
              `, [dailySpins, tier.id]);
                console.log(`🎰 Resetting ${dailySpins} wheel spins for ${tier.name} members`);
            }

            // Entregar cartones de BRONCE diarios (Embajador)
            if (dailyBronzeCards > 0) {
                console.log(`🎁 Awarding ${dailyBronzeCards} BRONCE cards to ${tier.name} members...`);
                await pool.query(`
                    UPDATE users 
                    SET gift_cards_bronce = gift_cards_bronce + ?
                    WHERE subscription_tier_id = ?
                `, [dailyBronzeCards, tier.id]);
            }

            // Entregar cartones de ORO diarios (Bronce/Plata/Oro members)
            if (dailyOroCards > 0) {
                console.log(`🏆 Awarding ${dailyOroCards} ORO cards to ${tier.name} members...`);
                await pool.query(`
                    UPDATE users 
                    SET gift_cards_oro = gift_cards_oro + ?
                    WHERE subscription_tier_id = ?
                `, [dailyOroCards, tier.id]);
            }
        }
        console.log('✅ Daily benefits reset complete.');
    }

    /**
     * Renew Subscriptions (Cron)
     * MVP: Simple expiration check. If auto_renew & balance sufficient -> renew. Else -> expire.
     */
    async processRenewals() {
        // Implementation for future robust recurring payments
        // For now, let's focus on buying logic.
        console.log('⏳ Processing renewals (Not fully implemented in MVP)');
    }

    /**
     * Distribute commissions to parents when user buys EMBAJADOR membership
     * 
     * SOLO aplica cuando se compra membresía Embajador ($5,000)
     * Porcentajes: L1=4%, L2=3%, L3=2%, L4=1%
     * 
     * Las comisiones quedan pendientes hasta que el usuario las cobra (1-10 del mes)
     */
    async distributeMembershipCommissions(userId, amount, connection, membershipId = null, io = null) {
        console.log(`🔍 Distributing commissions for user ${userId}, membership ${membershipId}, amount ${amount}`);

        // SOLO aplicar comisiones si es compra de EMBAJADOR
        if (membershipId !== EMBAJADOR_MEMBERSHIP_ID) {
            console.log(`ℹ️ Membresía ${membershipId} no es Embajador - no se generan comisiones por referidos`);
            return;
        }

        try {
            // Usar el nuevo servicio de comisiones por referidos
            const commissions = await referralCommissionService.applyCommissions(
                userId,
                amount,
                null, // purchaseId - podríamos pasar el ID de user_subscriptions
                io
            );

            console.log(`✅ Comisiones por referidos generadas: ${commissions.length}`);
            commissions.forEach(c => {
                console.log(`   L${c.level}: $${c.amount} para ${c.beneficiaryUsername}`);
            });

        } catch (error) {
            console.error('❌ Error distribuyendo comisiones por referidos:', error);
            // No lanzamos el error para no bloquear la compra
        }
    }
}

module.exports = new MembershipService();
