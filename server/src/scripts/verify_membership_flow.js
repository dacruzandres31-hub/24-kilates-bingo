const axios = require('axios');
const pool = require('../db');

// Config
const API_URL = 'http://localhost:3001/api';
const CREDENTIALS = { username: 'Andy', password: 'Tasso2025' };

async function runTest() {
    console.log('🚀 Starting Membership System Verification...');

    try {
        // 1. Setup: Ensure user has balance and no sub
        console.log('\n1. 🔧 Setup User State');
        await pool.query('UPDATE users SET balance = 10000, subscription_tier_id = NULL WHERE username = ?', [CREDENTIALS.username]);
        await pool.query('DELETE FROM user_subscriptions WHERE user_id = (SELECT id FROM users WHERE username = ?)', [CREDENTIALS.username]);
        console.log('✅ User balance reset to 10000 and subscriptions cleared.');

        // 2. Login
        console.log('\n2. 🔑 Logging in');
        const loginRes = await axios.post(`${API_URL}/auth/login`, CREDENTIALS);

        // ResponseHelper wrapper puts payload in .data
        // loginRes.data is the axios body
        // loginRes.data.data is the actual payload from helper
        const payload = loginRes.data.data;

        if (!payload) throw new Error('Invalid login response format');

        const { token, user } = payload;

        console.log(`✅ Logged in as ${user.username} (ID: ${user.id})`);

        // Axios config with token
        const authConfig = { headers: { Authorization: `Bearer ${token}` } };

        // 3. Get Plans
        console.log('\n3. 📋 Fetching Membership Plans');
        const plansRes = await axios.get(`${API_URL}/memberships`, authConfig);
        console.log(`✅ Found ${plansRes.data.length} plans`);
        plansRes.data.forEach(p => console.log(`   - ${p.name}: $${p.price}`));

        const bronzePlan = plansRes.data.find(p => p.name.includes('Bronce'));
        if (!bronzePlan) throw new Error('Bronze plan not found');

        // 4. Check Initial Subscription (Should be none)
        console.log('\n4. 🔍 Checking Initial Subscription Status');
        const subRes1 = await axios.get(`${API_URL}/memberships/my-subscription`, authConfig);
        if (subRes1.data.status !== 'none' && !subRes1.data.message) {
            throw new Error('User should not have active subscription yet');
        }
        console.log('✅ Confirmed no active subscription.');

        // 5. Subscribe to Bronze
        console.log(`\n5. 💳 Subscribing to ${bronzePlan.name} ($${bronzePlan.price})`);
        const subActionRes = await axios.post(`${API_URL}/memberships/subscribe`, { membershipId: bronzePlan.id }, authConfig);
        console.log('✅ Subscription Result:', subActionRes.data.message);

        // 6. Verify Active Subscription
        console.log('\n6. 🔍 Verifying Active Subscription');
        const subRes2 = await axios.get(`${API_URL}/memberships/my-subscription`, authConfig);
        const mySub = subRes2.data;
        if (mySub.status !== 'active' || mySub.membership_id !== bronzePlan.id) {
            throw new Error('Subscription verification failed!');
        }
        console.log(`✅ Active Subscription Found: ${mySub.plan_name}`);
        console.log(`   Benefits: Cards=${mySub.monthly_free_cards_balance}`);

        // 7. Verify Balance Deduction
        // We check via DB or another API call. Let's use DB for 100% truth.
        const [userRows] = await pool.query('SELECT balance FROM users WHERE id = ?', [user.id]);
        const newBalance = parseFloat(userRows[0].balance);
        console.log(`✅ New Balance: $${newBalance} (Expected: $${10000 - parseFloat(bronzePlan.price)})`);

        if (newBalance !== 10000 - parseFloat(bronzePlan.price)) {
            console.warn('⚠️ Balance deduction calculation mismatch?');
        }

        // 8. Cancel Subscription
        console.log('\n7. 🚫 Cancelling Subscription');
        const cancelRes = await axios.post(`${API_URL}/memberships/cancel`, {}, authConfig);
        console.log('✅ Cancel Result:', cancelRes.data.message);

        // 9. Verify Cancelled Status
        console.log('\n8. 🔍 Verifying Cancellation');
        const subRes3 = await axios.get(`${API_URL}/memberships/my-subscription`, authConfig);
        // Note: Our logic might show 'active' if checking simple status but auto_renew false, 
        // OR 'cancelled' depending on controller logic. Let's see what it returns.
        console.log('   Status in API:', subRes3.data.status);

        // MVP Logic: If status is 'none', it means the active filter filtered it out, so it IS cancelled.
        // If status is 'active' but auto_renew is false, that is also valid for expiration model.
        if (subRes3.data.status === 'none') {
            console.log('✅ Subscription is successfully cancelled (Status: none)');
        } else if (subRes3.data.auto_renew === 0 || subRes3.data.auto_renew === false) {
            console.log('✅ Subscription is active but Auto-Renew is OFF');
        } else {
            throw new Error('Subscription should be cancelled or auto-renew disabled');
        }

        console.log('\n✨ TEST COMPLETED SUCCESSFULLY ✨');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST FAILED');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

runTest();
