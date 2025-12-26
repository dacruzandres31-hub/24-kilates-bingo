// Script de prueba para verificar actualización de balance en tiempo real
const axios = require('axios');

async function testBalanceUpdate() {
    try {
        console.log('🧪 Probando actualización de balance en tiempo real...\n');

        // 1. Login como admin
        console.log('1️⃣ Logging in como admin...');
        const adminLogin = await axios.post('http://localhost:3001/api/auth/login', {
            username: 'Andy',
            password: 'password123' // Ajusta si es necesaria
        });

        const adminToken = adminLogin.data.token;
        console.log('✅ Admin logged in\n');

        // 2. Obtener ID de Eve27
        console.log('2️⃣ Buscando usuario Eve27...');
        const usersResponse = await axios.get('http://localhost:3001/api/admin/users/hierarchy', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        const eve27 = usersResponse.data.users.find(u => u.username === 'Eve27');
        if (!eve27) {
            console.error('❌ Usuario Eve27 no encontrado');
            return;
        }

        console.log(`✅ Eve27 encontrado - ID: ${eve27.id}, Balance actual: $${eve27.balance}\n`);

        // 3. Modificar balance
        console.log('3️⃣ Modificando balance (+1000)...');
        const updateResponse = await axios.post('http://localhost:3001/api/admin/users/add-balance', {
            userId: eve27.id,
            amount: 1000
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log('✅ Balance modificado:', updateResponse.data);
        console.log('\n📡 Verifica en la consola del navegador del jugador si recibió el evento "resources_updated"');
        console.log('📡 Verifica en los logs del servidor si se emitió el evento a user_' + eve27.id);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testBalanceUpdate();
