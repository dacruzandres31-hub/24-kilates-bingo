const axios = require('axios');

async function testFullLogin() {
    try {
        console.log('🔐 Probando login completo de Andy...\n');

        const response = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'Andy',
            password: '123456'
        });

        console.log('✅ Login exitoso!');
        console.log('\n📦 Respuesta completa del servidor:');
        console.log(JSON.stringify(response.data, null, 2));

        console.log('\n👤 Datos del usuario que se guardarían en localStorage:');
        const { token, user } = response.data.data;
        console.log('Token:', token.substring(0, 30) + '...');
        console.log('User:', JSON.stringify(user, null, 2));

        console.log('\n🔍 Verificación de rol:');
        console.log('user.role =', user.role);
        console.log('¿Es superadmin?', user.role === 'superadmin');
        console.log('¿Es admin?', user.role === 'admin');
        console.log('¿Es agente?', user.role === 'agente');

    } catch (error) {
        console.error('❌ Error en login:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('   Message:', error.message);
        }
    }
}

testFullLogin();
