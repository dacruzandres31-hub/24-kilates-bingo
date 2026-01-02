const pool = require('./src/db');

async function setupPartnerMembership() {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        console.log('--- 1. Adding referral_balance column to users ---');
        try {
            await connection.query('ALTER TABLE users ADD COLUMN referral_balance DECIMAL(20,2) DEFAULT 0.00 AFTER balance');
            console.log('✅ referral_balance column added.');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN') {
                console.log('ℹ️ referral_balance column already exists.');
            } else {
                throw e;
            }
        }

        console.log('--- 2. Inserting "Socio Embajador 24K" membership ---');
        const benefitsConfig = JSON.stringify({
            daily_bronze_cards: 1,
            referral_commission_membership: { l1: 0.04, l2: 0.03, l3: 0.02, l4: 0.01 }
        });

        // Delete if already exists to ensure clean insert for this run (using name as key)
        await connection.query('DELETE FROM memberships WHERE name = "Socio Embajador 24K"');

        const [result] = await connection.query(
            'INSERT INTO memberships (name, price, benefits_config, created_at) VALUES (?, ?, ?, NOW())',
            ['Socio Embajador 24K', 5000.00, benefitsConfig]
        );
        console.log(`✅ Membership inserted with ID: ${result.insertId}`);

        await connection.commit();
        console.log('🚀 Migration successful.');
        process.exit(0);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
}

setupPartnerMembership();
