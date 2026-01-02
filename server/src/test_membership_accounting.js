const axios = require('axios');

async function testMembershipAccounting() {
    try {
        // Login as Andy
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            username: 'Andy',
            password: 'Tasso2025'
        });

        const token = loginRes.data.token;
        console.log('✅ Login successful, token:', token.substring(0, 20) + '...');

        // Call accounting endpoint
        const accountingRes = await axios.get('http://localhost:3001/api/admin/memberships/accounting', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Accounting data:', JSON.stringify(accountingRes.data, null, 2));
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Full error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testMembershipAccounting();
