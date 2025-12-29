const axios = require('axios');

async function testLogin() {
    try {
        console.log('🔐 Probando login de Andy...');

        const response = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'Andy',
            password: '123456'
        });

        console.log('✅ Login exitoso!');
        console.log('Token:', response.data.data.token.substring(0, 20) + '...');
        console.log('User:', response.data.data.user);

    } catch (error) {
        console.error('❌ Error en login:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        } else {
            console.error('   Message:', error.message);
        }
    }
}

testLogin();
