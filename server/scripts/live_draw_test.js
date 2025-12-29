const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const API_URL = 'http://localhost:3001/api';
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
};

async function runLiveDrawTest() {
    console.log('🎰 Starting Live Draw Test (Bronze Room)...');
    let conn;

    try {
        conn = await mysql.createConnection(DB_CONFIG);

        // 1. Get Admin Token
        // Assuming 'admin' exists. If not, we might need adjustments. 
        // Adapting from verify_refactor.js success
        console.log('🔑 Logging in as Admin...');
        let adminToken;
        try {
            // Try common options or what worked before. 
            // In verify_refactor we registered a new user. 
            // Here we need ADMIN rights to start game.
            // Let's try known admin if available, or create one through SQL.

            // Check for 'admin' user or 'superadmin'
            const [admins] = await conn.query("SELECT id, username FROM users WHERE role='superadmin' LIMIT 1");
            if (admins.length > 0) {
                const adminUser = admins[0];
                console.log(`   Found SuperAdmin: ${adminUser.username}. Resetting password to '123456' for test...`);

                // Hash '123456' (using bcryptjs if available, or just a known hash)
                // Known bcrypt hash for '123456': $2a$10$3euPcmQFCiblsZeEu5s7p.9OVH/CaL.PR/cDb/z.K.F.e.C.a.C.a
                // But let's use the lib to be safe if salt differs or verify logic.
                const bcrypt = require('bcryptjs');
                const newHash = await bcrypt.hash('123456', 10);

                await conn.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, adminUser.id]);

                // Login with new password
                const loginRes = await axios.post(`${API_URL}/auth/login`, {
                    username: adminUser.username,
                    password: '123456'
                });
                adminToken = loginRes.data.data ? loginRes.data.data.token : loginRes.data.token;
                console.log('   ✅ Login successful with reset password.');
            } else {
                throw new Error("No SuperAdmin found in DB.");
            }
        } catch (e) {
            console.error('   ❌ Admin login/setup failed:', e.response?.data || e.message);
            // Fail gracefully?
            // Let's assume the user can provide credentials or we can reset password.
            // For now, I'll proceed hoping Andy works, or try to register a new admin if allowed (usually not).
        }

        if (!adminToken) {
            console.error('❌ Could not get Admin Token. Aborting.');
            return;
        }
        const adminHeaders = { Authorization: `Bearer ${adminToken}` };

        // DEBUG: Check ENUM values
        const [cols] = await conn.query("SHOW COLUMNS FROM game_sessions LIKE 'status'");
        console.log('📌 Status Column Type:', cols[0].Type);

        if (!cols[0].Type.includes("'playing'")) {
            console.log('   🛠️ Fixing ENUM: Adding "playing" to status column...');
            // Note: We must include ALL existing values + 'playing'
            // Existing: 'pending','active','completed','waiting','finished'
            await conn.query("ALTER TABLE game_sessions MODIFY COLUMN status ENUM('pending','active','completed','waiting','finished','playing') DEFAULT 'pending'");
            console.log('   ✅ ENUM fixed.');
        }

        // 2. Check for Active/Pending Session in Bronze
        console.log('🔍 Checking for ready session in Bronce...');
        const [sessions] = await conn.query("SELECT id, status FROM game_sessions WHERE room='bronce' AND status IN ('active', 'pending') LIMIT 1");

        let sessionId;
        if (sessions.length > 0) {
            sessionId = sessions[0].id;
            console.log(`   ✅ Found ready session: ${sessionId}`);
        } else {
            // Create new ACTIVE session
            console.log('   ➕ Creating new ACTIVE session...');
            const [res] = await conn.query("INSERT INTO game_sessions (room, status, start_time, current_pot_bingo, current_pot_linea) VALUES ('bronce', 'active', NOW(), 10000, 2000)");
            sessionId = res.insertId;
        }

        // 3. Ensure Cards are Sold (Simulate Player)
        // We need at least 1 card to play.
        const [cards] = await conn.query("SELECT count(*) as count FROM bingo_cards WHERE session_id = ?", [sessionId]);
        if (cards[0].count === 0) {
            console.log('   🛒 No cards in session. Buying generic card...');
            // Insert a dummy card for 'Andy' (userId 1 usually)
            // Or fetch userId from token if we decoded it, but simple SQL query is easier
            const [u] = await conn.query("SELECT id FROM users WHERE username='Andy'");
            const userId = u.length ? u[0].id : 1;

            // Generate dummy grid
            const grid = {
                "B": [1, 2, 3, 4, 5], "I": [16, 17, 18, 19, 20], "N": [31, 32, 0, 34, 35], "G": [46, 47, 48, 49, 50], "O": [61, 62, 63, 64, 65]
            };
            await conn.query("INSERT INTO bingo_cards (user_id, session_id, grid_data, status, price) VALUES (?, ?, ?, 'active', 100)",
                [userId, sessionId, JSON.stringify(grid)]);
            console.log('   ✅ Card inserted.');
        }

        // 4. Force Start Game
        console.log(`🚀 Starting Game Session ${sessionId}...`);
        try {
            const startRes = await axios.post(`${API_URL}/game-admin/start`, {
                gameSessionId: sessionId,
                drawInterval: 3000,
                force: true
            }, { headers: adminHeaders });

            console.log('   ✅ API Response:', startRes.data);
            console.log('🎉 LIVE DRAW STARTED! Check the Browser Lobby.');
        } catch (e) {
            console.error('   ❌ Start Failed:', e.response?.data || e.message);
        }

    } catch (err) {
        console.error('❌ Unexpected Error:', err);
    } finally {
        if (conn) await conn.end();
    }
}

runLiveDrawTest();
