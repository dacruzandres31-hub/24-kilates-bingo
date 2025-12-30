const io = require('socket.io-client');
const axios = require('axios');

const URL = 'http://localhost:3001'; // Port from index.js
const API_URL = 'http://localhost:3001/api';

async function testSocket() {
    try {
        // 1. Login to get token and userId
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'Andy',
            password: 'Tasso2025'
        });

        const token = loginRes.data.token;
        const user = loginRes.data.user;
        console.log('Login successful. User:', user.username, 'ID:', user.id);

        // 2. Connect to Socket
        console.log('Connecting to socket...');
        const socket = io(URL, {
            transports: ['websocket'],
            auth: {
                token: token
            }
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected! ID:', socket.id);

            // 3. Join Personal Room
            console.log('Joining personal room...');
            socket.emit('join_personal_room', { userId: user.id });
        });

        socket.on('connect_error', (err) => {
            console.error('❌ Connection Error:', err.message);
            process.exit(1);
        });

        // 4. Listen for events
        socket.on('pot_update', (data) => {
            console.log('✅ Received pot_update event:', data);
            // If we receive an event, we can consider it partial success, but we probably won't get one immediately without triggering it.
        });

        // Wait a bit to ensure connection and join works
        setTimeout(() => {
            if (socket.connected) {
                console.log('✅ Test Passed: Socket maintained connection.');
                socket.disconnect();
                process.exit(0);
            } else {
                console.error('❌ Test Failed: Socket not connected after timeout.');
                process.exit(1);
            }
        }, 3000);

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) console.error('Response:', error.response.data);
        process.exit(1);
    }
}

testSocket();
