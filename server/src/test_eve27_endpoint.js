const axios = require('axios');

async function testEve27Subscription() {
    try {
        // Login as Eve27
        console.log('🔐 Intentando login como Eve27...\n');
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            username: 'Eve27',
            password: 'password' // Ajusta si es diferente
        });

        const token = loginRes.data.token;
        console.log('✅ Login exitoso\n');

        // Get subscription
        console.log('📞 Consultando /api/memberships/my-subscription...\n');
        const subRes = await axios.get('http://localhost:3001/api/memberships/my-subscription', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('📋 Respuesta del endpoint:');
        console.log(JSON.stringify(subRes.data, null, 2));

        if (subRes.data.subscription) {
            console.log('\n✅ Suscripción encontrada:');
            console.log(`   Tier: ${subRes.data.subscription.tier_name || subRes.data.subscription.name}`);
            console.log(`   Status: ${subRes.data.subscription.status}`);
            console.log(`   Next Billing: ${subRes.data.subscription.next_billing_date}`);
        } else {
            console.log('\n❌ No se encontró suscripción en la respuesta');
            console.log('⚠️ El frontend mostrará "No tienes suscripción activa"');
        }

        if (subRes.data.pendingRequest) {
            console.log('\n⏳ Solicitud pendiente encontrada:');
            console.log(JSON.stringify(subRes.data.pendingRequest, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.log('\n💡 Intenta con la contraseña correcta de Eve27');
        }
    }
}

testEve27Subscription();
