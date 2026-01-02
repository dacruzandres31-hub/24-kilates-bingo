const pool = require('./db');

async function fix() {
    try {
        const userId = 1040;
        const details = JSON.stringify({ planName: 'Socio Oro', membershipId: 3 });

        console.log('Inserting pending request...');
        await pool.query(`
            INSERT INTO deposit_requests 
            (user_id, account_id, amount_declared, proof_image_url, details, request_type, target_user_id, status, created_at) 
            VALUES (?, 2, '50000', 'fake_url', ?, 'membership_purchase', ?, 'pending', NOW())
        `, [userId, details, userId]);

        console.log('✅ Pending request inserted.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fix();
