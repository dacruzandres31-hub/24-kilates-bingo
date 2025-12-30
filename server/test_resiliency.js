
const axios = require('axios');
const io = require('socket.io-client');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const API_URL = 'http://localhost:3001';
let adminToken = '';

async function loginAdmin() {
    try {
        const response = await axios.post(`${API_URL}/api/auth/login`, {
            username: 'admin',
            password: 'adminpassword123'
        });
        adminToken = response.data.token;
        console.log('✅ Admin logged in');
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        process.exit(1);
    }
}

async function createAndStartSession() {
    try {
        // 1. Create session
        const createRes = await axios.post(`${API_URL}/api/admin/game-sessions`, {
            room: 'starter',
            type: 'manual',
            scheduledTime: new Date(Date.now() + 5000).toISOString(),
            drawInterval: 2000,
            pauseOnWinner: 1000,
            roomName: 'SALA TEST RESILIENCIA'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const sessionId = createRes.data.session.id;
        console.log(`✅ Session created: ${sessionId}`);

        // 2. Start session
        await axios.post(`${API_URL}/api/admin/game-sessions/${sessionId}/start`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`✅ Session ${sessionId} started`);

        return sessionId;
    } catch (error) {
        console.error('❌ Error in session creation/start:', error.response?.data || error.message);
        process.exit(1);
    }
}

function monitorBalls(sessionId) {
    return new Promise((resolve) => {
        const socket = io(API_URL);
        let ballsReceived = 0;

        socket.on('connect', () => {
            console.log('🔌 Connected to WebSocket');
            socket.emit('join_session', { sessionId });
        });

        socket.on('number_drawn', (data) => {
            ballsReceived++;
            console.log(`🎱 Ball received: ${data.number} (#${ballsReceived})`);

            if (ballsReceived === 3) {
                console.log('🚀 3 balls drawn. SIMULATING CRASH (stopping test)...');
                socket.disconnect();
                resolve(sessionId);
            }
        });
    });
}

async function runTest() {
    console.log('🧪 STARTING RESILIENCY TEST');
    await loginAdmin();
    const sessionId = await createAndStartSession();
    await monitorBalls(sessionId);

    console.log('\n--- MANUAL STEP REQUIRED ---');
    console.log(`1. Stop the server (Ctrl+C in the server terminal)`);
    console.log(`2. Start the server again (npm run dev)`);
    console.log(`3. Observe if session ${sessionId} resumes automatically in the server logs`);
    console.log(`4. Run another script to verify the state update for sessionId ${sessionId}`);
    console.log('----------------------------\n');
}

runTest();
