const axios = require('axios');

async function testManualDraw() {
    try {
        console.log('🧪 Probando sorteo manual de UNA bola...');

        const response = await axios.post('http://localhost:3001/api/game-admin/draw-one', {
            gameSessionId: 59
        }, {
            headers: {
                'Authorization': 'Bearer ' + process.env.ADMIN_TOKEN || 'test-token'
            }
        });

        console.log('✅ Respuesta:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testManualDraw();
