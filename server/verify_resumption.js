
const axios = require('axios');
const io = require('socket.io-client');

const API_URL = 'http://localhost:3001';
const sessionId = process.argv[2];

if (!sessionId) {
    console.error('Usage: node verify_resumption.js <sessionId>');
    process.exit(1);
}

const socket = io(API_URL);

socket.on('connect', () => {
    console.log(`🔌 Connected to WebSocket. Joining session ${sessionId}...`);
    socket.emit('join_session', { sessionId });
});

socket.on('current_game_state', (state) => {
    console.log('🔄 CURRENT GAME STATE RECEIVED:');
    console.log(JSON.stringify(state, null, 2));

    if (state.ballsDrawn && state.ballsDrawn.length >= 3) {
        console.log(`✅ SUCCESS: Session ${sessionId} resumed with ${state.ballsDrawn.length} balls.`);
    } else {
        console.log(`❌ FAILURE: Session ${sessionId} state is incorrect or not resumed.`);
    }
});

socket.on('number_drawn', (data) => {
    console.log(`🎱 New ball drawn: ${data.number}. The game IS ACTIVE!`);
});

setTimeout(() => {
    console.log('⏱️ Timeout - Closing...');
    socket.disconnect();
    process.exit(0);
}, 10000);
