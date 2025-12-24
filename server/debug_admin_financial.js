
const adminController = require('./src/controllers/adminController');
const pool = require('./src/db');
const MoneyMath = require('./src/utils/moneyMath');

// Mock req, res
const req = {
    user: { id: 1, role: 'superadmin' },
    query: {}
};

const res = {
    json: (data) => console.log('✅ Response:', JSON.stringify(data, null, 2)),
    status: (code) => {
        console.log('⚠️ Status:', code);
        return {
            json: (data) => console.log('❌ Error Response:', data)
        };
    }
};

async function testFinancial() {
    try {
        console.log('🧪 Testing getFinancialSummary...');
        // We need to bind the controller execution context or just call it if it's exported
        // The controller is exported as functions in adminController

        // We can't easily call the controller function isolated if it depends on specific exports?
        // Let's call it directly.

        // But adminController requires './src/db' which assumes CWD.
        // Ensure we run from 'server' dir.

        // It seems adminController exports functions directly.
        // Let's inspect what adminController exports.
    } catch (e) {
        console.log(e);
    }
}

// Actually better to just run the query logic extracted from adminController to isolate DB issues
async function debugFinancialLogic() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ DB Connected');

        // Logic from getFinancialSummary
        const [todayStats] = await connection.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN movement_type = 'purchase' THEN amount ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN movement_type = 'prize' THEN amount ELSE 0 END), 0) as prizesDistributed,
        COUNT(DISTINCT user_id) as activeUsers
      FROM chips_movements 
      WHERE DATE(created_at) = CURDATE()
    `);

        console.log('📊 Financial Stats:', todayStats[0]);

        // Logic from getAdminProfile (simplified for userId 1)
        console.log('👤 Testing Admin Profile Query...');
        const [users] = await connection.query(
            `SELECT u.id, u.username, u.role, u.balance,
        COALESCE(SUM(CASE WHEN uci.room = 'bronce' THEN uci.quantity ELSE 0 END), 0) as cards_bronce,
        COALESCE(SUM(CASE WHEN uci.room = 'plata' THEN uci.quantity ELSE 0 END), 0) as cards_plata,
        COALESCE(SUM(CASE WHEN uci.room = 'oro' THEN uci.quantity ELSE 0 END), 0) as cards_oro
       FROM users u
       LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
       WHERE u.id = ?
       GROUP BY u.id`,
            [1]
        );
        console.log('👤 Profile:', users[0]);

        connection.release();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

debugFinancialLogic();
