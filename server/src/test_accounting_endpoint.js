const axios = require('axios');

async function testEndpoint() {
    try {
        // Login as Andy
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            username: 'Andy',
            password: 'Tasso2025'
        });

        const token = loginRes.data.token;
        console.log('✅ Login exitoso\n');

        // Call accounting endpoint
        console.log('📞 Llamando al endpoint de contabilidad...\n');
        const accountingRes = await axios.get('http://localhost:3001/api/admin/memberships/accounting', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Respuesta exitosa:');
        console.log(JSON.stringify(accountingRes.data, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.status === 500) {
            console.error('\n📋 Detalles del error 500:');
            console.error(JSON.stringify(error.response.data, null, 2));
        }
    }
}

testEndpoint();
