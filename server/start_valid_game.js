const axios = require('axios');
const mysql = require('mysql2/promise');

const API_URL = 'http://localhost:3001/api';

function generateGrid() {
    // Random grid generation
    const grid = {
        "B": [], "I": [], "N": [], "G": [], "O": []
    };

    // Helpers
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const getUnique = (arr, min, max) => {
        let n;
        do { n = rand(min, max); } while (arr.includes(n));
        return n;
    };

    for (let i = 0; i < 5; i++) grid.B.push(getUnique(grid.B, 1, 15));
    for (let i = 0; i < 5; i++) grid.I.push(getUnique(grid.I, 16, 30));
    for (let i = 0; i < 5; i++) {
        if (i === 2) grid.N.push(0); // Free space
        else grid.N.push(getUnique(grid.N, 31, 45));
    }
    for (let i = 0; i < 5; i++) grid.G.push(getUnique(grid.G, 46, 60));
    for (let i = 0; i < 5; i++) grid.O.push(getUnique(grid.O, 61, 75));

    return grid;
}

async function startValidGame() {
    let conn;
    try {
        console.log('🚀 Setting up valid game (SQL)...');

        conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        // 1. Get Admin User
        const [users] = await conn.query("SELECT id FROM users WHERE username='Andy'");
        if (users.length === 0) throw new Error("User Andy not found");
        const userId = users[0].id;

        // 2. Create Session (ACTIVE, bronze)
        const [sessionRes] = await conn.query(
            `INSERT INTO game_sessions (room, status, current_pot_bingo, current_pot_linea, start_time) 
         VALUES ('bronce', 'active', 5000, 1000, NOW())`
        );
        const sessionId = sessionRes.insertId;
        console.log(`✅ Session created: ${sessionId}`);

        // 3. Insert 5 Cards
        for (let i = 0; i < 5; i++) {
            const grid = generateGrid();
            await conn.query(
                `INSERT INTO bingo_cards (user_id, session_id, grid_data, status, price)
             VALUES (?, ?, ?, 'active', 100)`,
                [userId, sessionId, JSON.stringify(grid)]
            );
        }
        console.log(`✅ Inserted 5 active bingo cards for user ${userId}`);

        // 4. API Login & Start
        const login = await axios.post(`${API_URL}/auth/login`, {
            username: 'Andy',
            password: 'Tasso2025'
        });
        const token = login.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        await axios.post(`${API_URL}/game-admin/start`, {
            gameSessionId: sessionId,
            drawInterval: 2000, // 2 seconds per ball
            pauseOnWinner: 5000
        }, { headers });
        console.log(`✅ Game started via API!`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
    } finally {
        if (conn) await conn.end();
    }
}

startValidGame();
