const io = require('socket.io-client');
const axios = require('axios');

const SOCKET_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:3001/api';

async function verifyWebSocket() {
    console.log('🔍 Connecting to WebSocket...');

    // 1. Get active session (Arg or API)
    let sessionId = process.argv[2];
    const userId = 1; // Andy

    try {
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            username: 'Andy',
            password: 'Tasso2025'
        });
        const token = adminLogin.data.token;

        if (!sessionId) {
            console.log('Checking /status for active session...');
            try {
                const status = await axios.get(`${API_URL}/game-admin/status`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (status.data.activeGames && status.data.activeGames.length > 0) {
                    sessionId = status.data.activeGames[0].sessionId;
                    console.log(`✅ Found active session: ${sessionId}`);
                } else {
                    console.error('❌ No active games found via /status.');
                }
            } catch (e) {
                console.error('⚠️ Warning: /status failed (' + e.message + ')');
            }
        }

        if (!sessionId) {
            console.error('❌ Missing Session ID. Provide it as argument: node verify_websocket_event.js <id>');
            process.exit(1);
        }

        console.log(`ℹ️ Using Session ID: ${sessionId}`);

    } catch (error) {
        console.error('❌ Error in auth:', error.message);
        process.exit(1);
    }

    // 2. Connect Socket
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
        console.log(`✅ Socket connected: ${socket.id}`);

        // Join PERSONAL room
        console.log(`➡️ Joining personal room: user_${userId}`);
        socket.emit('join_personal_room', { userId: userId });

        // Join GAME room
        console.log(`➡️ Joining game room: ${sessionId} (bronce)`);
        socket.emit('join_game', { userId: userId, room: 'bronce' });
    });

    // 3. Listen for events
    let eventReceived = false;

    socket.on('cards_reordered', (data) => {
        console.log('🎉 EVENT RECEIVED: cards_reordered');
        console.log('Data:', JSON.stringify(data, null, 2));
        eventReceived = true;
        console.log('✅ TEST PASSED: WebSocket optimization is working!');

        // Verify NOT polling? 
        // We can't verify network traffic here easily, but the presence of this
        // event confirms the push mechanism is active.

        socket.disconnect();
        process.exit(0);
    });

    socket.on('ball_drawn', (data) => {
        console.log(`🎱 Ball drawn: ${data.letter}${data.number}`);
    })

    // 4. Timeout
    setTimeout(() => {
        if (!eventReceived) {
            console.error('❌ TIMEOUT: Did not receive cards_reordered event in 30 seconds.');
            socket.disconnect();
            process.exit(1);
        }
    }, 30000);
}

verifyWebSocket();
