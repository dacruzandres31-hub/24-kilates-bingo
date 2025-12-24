
const ChipsService = require('./src/services/chipsService');
const pool = require('./src/db');
const MoneyMath = require('./src/utils/moneyMath');

async function debugWithdrawal() {
    try {
        console.log('🐞 Starting Debug...');

        // 1. Get a test user (any valid user)
        let user;
        const [users] = await pool.query("SELECT id, balance, username FROM users WHERE balance > 0 LIMIT 1");
        if (users.length === 0) {
            // Create a user if none
            console.log('⚠️ No users with balance, using ID 1 regardless...');
            user = { id: 1, balance: 10000 };
        } else {
            user = users[0];
        }
        console.log('👤 User found:', user);

        // 2. Mock Data
        const amount = 100;
        const bankAccountHolder = 'Test User';
        const cbu = 'Alias.Test.123';
        const bankName = 'Test Bank';
        const accountType = 'savings';

        console.log('📝 Attempting to create withdrawal request...');
        const result = await ChipsService.createWithdrawalRequest(
            user.id,
            amount,
            bankAccountHolder,
            cbu,
            bankName,
            accountType
        );

        console.log('✅ Success:', result);

    } catch (error) {
        console.error('❌ Error caught:', error);
        console.error(error.stack);
    } finally {
        pool.end();
    }
}

debugWithdrawal();
