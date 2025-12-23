const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupTestData() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });

  try {
    // 1. Crear sesión activa
    const [sessionResult] = await conn.query(
      `INSERT INTO game_sessions (room, status, current_pot_bingo, current_pot_linea) 
       VALUES ('Bronce', 'active', 25000, 2500)`
    );
    const sessionId = sessionResult.insertId;
    console.log(`Session ID: ${sessionId}`);

    // 2. Usar siempre el usuario admin para simplificar
    const [adminUsers] = await conn.query(`SELECT id, username FROM users WHERE username = 'Andy' LIMIT 1`);
    if (adminUsers.length === 0) {
      throw new Error('Usuario admin no encontrado');
    }
    const userId = adminUsers[0].id;
    const username = adminUsers[0].username;
    console.log(`Using user: ${username} (id: ${userId})`);

    // 3. Crear cartón con números específicos que respetan rangos BINGO
    // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
    const gridData = {
      "B": [1, 10, 13, 14, 15],      // B: 1-15
      "I": [16, 20, 25, 28, 30],     // I: 16-30
      "N": [31, 35, 0, 42, 45],      // N: 31-45 (0 = FREE)
      "G": [46, 50, 55, 58, 60],     // G: 46-60
      "O": [61, 65, 70, 72, 75]      // O: 61-75
    };

    const [cardResult] = await conn.query(
      `INSERT INTO bingo_cards (user_id, session_id, grid_data, status, price)
       VALUES (?, ?, ?, 'active', 100)`,
      [userId, sessionId, JSON.stringify(gridData)]
    );
    const cardId = cardResult.insertId;
    console.log(`Card ID: ${cardId}`);
    console.log('Grid (primera fila): B-1, I-16, N-31, G-46, O-61');

    // 4. Insertar números cantados para completar PRIMERA FILA HORIZONTAL
    // Primera fila = gridData.B[0], gridData.I[0], gridData.N[0], gridData.G[0], gridData.O[0]
    const numbers = [
      { num: 1, letter: 'B', order: 1 },
      { num: 16, letter: 'I', order: 2 },
      { num: 31, letter: 'N', order: 3 },
      { num: 46, letter: 'G', order: 4 },
      { num: 61, letter: 'O', order: 5 }
    ];

    for (const n of numbers) {
      await conn.query(
        `INSERT INTO game_session_balls (game_session_id, ball_number, ball_letter, draw_order)
         VALUES (?, ?, ?, ?)`,
        [sessionId, n.num, n.letter, n.order]
      );
    }

    console.log('Numbers called: B-1, I-16, N-31, G-46, O-61 (horizontal_1 completa ✓)');
    console.log('SUCCESS');

  } finally {
    await conn.end();
  }
}

setupTestData().catch(console.error);
