const pool = require('./db');

async function checkUsersTable() {
    try {
        const [rows] = await pool.query('DESCRIBE users');
        const columns = rows.map(r => r.Field);
        console.log('Columns in users table:', columns);

        const hasReferralBalance = columns.includes('referral_balance');
        console.log('Has referral_balance:', hasReferralBalance);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkUsersTable();
