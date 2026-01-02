const axios = require('axios');

async function testVIPPayment() {
    try {
        console.log('=== TESTING VIP PAYMENT ENDPOINT ===\n');

        // Test with admin token to check endpoint directly
        console.log('1. Logging in as admin (Elchiqui)...');
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            username: 'Elchiqui',
            password: 'Elchiqui'
        });

        const token = loginRes.data.token;
        console.log('✅ Login successful\n');

        // Test: Call /api/deposits/info?purpose=membership
        console.log('2. Calling /api/deposits/info?purpose=membership...');
        try {
            const depositRes = await axios.get('http://localhost:3001/api/deposits/info?purpose=membership', {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('✅ Response received:');
            console.log(JSON.stringify(depositRes.data, null, 2));
        } catch (err) {
            console.error('❌ Error calling endpoint:');
            console.error('Status:', err.response?.status);
            console.error('Message:', err.response?.data?.message || err.message);
            console.error('Full error:', JSON.stringify(err.response?.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Login Error:', error.response?.data || error.message);
    }
}

testVIPPayment();
