const pool = require('../db');

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
     * Get formatted subscription details for a user
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

            // 7. Distribute commissions inside the transaction for atomicity.
            await this.distributeMembershipCommissions(userId, plan.price, connection);

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

            // 4. Update User Benefits
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

            await connection.commit();

            // Distribute commissions
            await this.distributeMembershipCommissions(userId, plan.price, connection);

            await connection.commit();

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

    async getPendingPurchase(userId) {
        const [rows] = await pool.query(`
            SELECT id, details, created_at 
            FROM deposit_requests 
            WHERE user_id = ? 
            AND status = 'pending' 
            AND request_type = 'membership_purchase'
            ORDER BY created_at DESC 
            LIMIT 1
        `, [userId]);
        return rows[0];
    }

    /**
     * Reset daily benefits (e.g. Wheel Spins)
     * To be called by cron job every midnight
     */
    async resetDailyBenefits() {
        console.log('🔄 Running Daily Membership Benefit Reset...');

        const [tiers] = await pool.query('SELECT id, benefits_config FROM memberships');

        for (const tier of tiers) {
            const config = typeof tier.benefits_config === 'string' ? JSON.parse(tier.benefits_config) : tier.benefits_config;
            const dailySpins = config.wheel_daily_spins || 0;
            const dailyBronzeCards = config.daily_bronze_cards || 0;

            if (dailySpins > 0) {
                await pool.query(`
                  UPDATE users 
                  SET daily_wheel_spins_balance = ? 
                  WHERE subscription_tier_id = ?
              `, [dailySpins, tier.id]);
            }

            if (dailyBronzeCards > 0) {
                console.log(`🎁 Awarding ${dailyBronzeCards} Bronze cards to ${tier.name} members...`);
                // Se las sumamos a su inventario de tickets bronce
                // Importante: No pisamos, sumamos.
                await pool.query(`
                    UPDATE users 
                    SET 
                      gift_cards_bronce = gift_cards_bronce + ?
                    WHERE subscription_tier_id = ?
                `, [dailyBronzeCards, tier.id]);
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
     * Distribute commissions to parents if they have an active "Socio Embajador" membership
     */
    async distributeMembershipCommissions(userId, amount, connection) {
        console.log(`🔍 Distributing commissions for user ${userId}, amount ${amount}`);

        // 1. Get referral tree (parents up to 4 levels)
        const [users] = await connection.query('SELECT referred_by, parent_id FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return;

        const rates = [0.04, 0.03, 0.02, 0.01]; // L1, L2, L3, L4
        let currentParentId = users[0].referred_by || users[0].parent_id;

        // Get the ID of "Socio Embajador 24K" to check eligibility
        const [ambassadorTier] = await connection.query('SELECT id FROM memberships WHERE name = "Socio Embajador 24K"');
        if (ambassadorTier.length === 0) return;
        const ambassadorTierId = ambassadorTier[0].id;

        for (let level = 1; level <= 4; level++) {
            if (!currentParentId) break;

            // 2. Check if parent has active "Socio Embajador 24K" membership
            const [parents] = await connection.query(
                'SELECT id, subscription_tier_id, referral_balance FROM users WHERE id = ? FOR UPDATE',
                [currentParentId]
            );

            if (parents.length > 0) {
                const parent = parents[0];
                if (parent.subscription_tier_id === ambassadorTierId) {
                    const commission = amount * rates[level - 1];
                    console.log(`✅ Awarding $${commission} to parent ${parent.id} (L${level})`);

                    // 3. Acreditamos en su referral_balance
                    await connection.query(
                        'UPDATE users SET referral_balance = referral_balance + ? WHERE id = ?',
                        [commission, parent.id]
                    );

                    // 4. Registrar movimiento de auditoría (opcional, pero recomendado)
                    // Podríamos crear una tabla chips_movements para esto o una nueva referral_movements
                } else {
                    console.log(`ℹ️ Parent ${parent.id} (L${level}) doesn't have active Ambassador sub. Skipping.`);
                }

                // Prepare next level
                const [nextParent] = await connection.query('SELECT referred_by, parent_id FROM users WHERE id = ?', [parent.id]);
                currentParentId = nextParent.length > 0 ? (nextParent[0].referred_by || nextParent[0].parent_id) : null;
            } else {
                currentParentId = null;
            }
        }
    }
}

module.exports = new MembershipService();
