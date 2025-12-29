const axios = require('axios');
const API_URL = 'http://localhost:3001/api';

async function monitorGame() {
    console.log('👀 Monitoring Game Status...');
    // We assume 'active games' are public info via admin endpoint or similar? 
    // Actually /game-admin/status likely needs auth.
    // I need the token or I can just hit /health to see if logs show activity? No.
    // I will try to use the same logic as live_draw_test to get token.
    // Or I can just check the server logs via `read_terminal` if I had checking enabled.
    // I'll reuse the token approach.

    // Quick hack: I'll try without auth first, if 401/403 I'll implement login.
    // But verify_refactor says admin endpoints need auth.

    // I will just implement login again because I reset the password to 123456.
    try {
        const login = await axios.post(`${API_URL}/auth/login`, { username: 'Andy', password: '123456' });
        const token = login.data.data ? login.data.data.token : login.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        for (let i = 0; i < 5; i++) {
            const res = await axios.get(`${API_URL}/game-admin/status`, { headers });
            const games = res.data.activeGames || [];
            if (games.length === 0) {
                console.log(`[${i}] No active games found.`);
            } else {
                games.forEach(g => {
                    console.log(`[${i}] Session ${g.sessionId} (Room: ${g.roomId}): ${g.ballsDrawn} balls drawn. Paused: ${g.isPaused}`);
                });
            }
            await new Promise(r => setTimeout(r, 3000));
        }
    } catch (e) {
        console.error('Monitor failed:', e.message);
    }
}

monitorGame();
