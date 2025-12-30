const io = require('socket.io-client');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const sessionId = 103;
const apiUrl = 'http://localhost:3001/api';

async function run() {
    // 1. Generar token
    const token = jwt.sign(
        { id: 1, username: 'Andy', role: 'superadmin' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
    );
    console.log('✅ Token generado');

    // 2. Conectar socket
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
        console.log('✅ Monitor conectado');
        socket.emit('join_session', { sessionId });
        socket.emit('join_room_spectator', { room: 'bronce' });
    });

    socket.on('number_drawn', (data) => {
        console.log(`[BALL] 🔴 Bola: ${data.ballLetter}-${data.number} (#${data.drawOrder})`);
    });

    socket.on('line_winner', (data) => {
        console.log(`[WINNER] 🏆 ${data.winner.username} ganó LÍNEA $${data.prizeAmount}`);
    });

    socket.on('bingo_winner', (data) => {
        console.log(`[WINNER] 🎊 ${data.winner.username} ganó BINGO $${data.prizeAmount}`);
    });

    socket.on('game_finished', (data) => {
        console.log(`[FINISH] 🏁 Sorteo finalizado en sesión ${data.gameSessionId}`);
        process.exit(0);
    });

    socket.on('game_started', (data) => {
        console.log(`[START] 🎮 Sorteo iniciado: ${JSON.stringify(data)}`);
    });

    // 3. Iniciar sorteo
    try {
        console.log('🚀 Iniciando sorteo vía API...');
        const resp = await axios.post(`${apiUrl}/game-admin/start`, {
            gameSessionId: sessionId,
            drawInterval: 500
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Sorteo iniciado:', resp.data.message);
    } catch (e) {
        if (e.response?.status === 500 && e.response?.data?.message?.includes('ya está activa')) {
            console.log('ℹ️ El sorteo ya estaba activo.');
        } else {
            console.error('❌ Error iniciando sorteo:', e.response?.data || e.message);
            process.exit(1);
        }
    }
}

run();

// Timeout
setTimeout(() => {
    console.log('⏰ Test finalizado por timeout (60s)');
    process.exit(0);
}, 60000);
