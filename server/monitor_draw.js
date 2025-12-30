const io = require('socket.io-client');
const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('✅ Monitor conectado al servidor');
    socket.emit('join_session', { sessionId: 103 });
    socket.emit('join_room_spectator', { room: 'bronce' });
});

socket.on('ball_drawn', (data) => {
    console.log(`[BALL] 🔴 Bola sorteada: ${data.ball} (Sorteo: ${data.gameSessionId})`);
});

socket.on('winner_found', (data) => {
    console.log(`[WINNER] 🏆 Ganador de ${data.type.toUpperCase()}: ${data.username} - $${data.amount}`);
});

socket.on('game_finished', (data) => {
    console.log(`[FINISH] 🏁 Sorteo finalizado: Session ${data.gameSessionId}`);
    process.exit(0);
});

// Timeout por seguridad
setTimeout(() => {
    console.log('⏰ Monitor finalizado por timeout');
    process.exit(0);
}, 60000);
