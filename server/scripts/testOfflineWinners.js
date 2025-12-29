const pool = require('../src/db');
const GameEngineAuto = require('../src/services/gameEngineAuto');
const axios = require('axios');

async function testOfflineWinners() {
    console.log('🧪 Iniciando TEST de Ganadores Offline...');

    try {
        // 1. Obtener un usuario de prueba (usaremos Andy por conveniencia)
        const [users] = await pool.query('SELECT id, username, balance FROM users WHERE username = "Andy"');
        if (users.length === 0) throw new Error('Usuario Andy no encontrado');
        const user = users[0];
        console.log(`👤 Usuario de prueba: ${user.username} (ID: ${user.id}, Balance: ${user.balance})`);

        // 2. Crear una sesión de juego ficticia (Sala Starter)
        const [sessionResult] = await pool.query(`
            INSERT INTO game_sessions (room, status, jackpot_linea, jackpot_bingo, jackpot_pre40)
            VALUES ('starter', 'active', 100.00, 500.00, 1000.00)
        `);
        const sessionId = sessionResult.insertId;
        console.log(`🎮 Sesión creada: ID ${sessionId}`);

        // 3a. Crear un cartón en validated_cards (Sala Bronce - Paga)
        const cardDataPaga = {
            rows: [
                [1, 11, 21, 31, 41, null, null, null, null],
                [2, 12, 22, 32, 42, null, null, null, null],
                [3, 13, 23, 33, 43, null, null, null, null]
            ]
        };

        const [cardResultPaga] = await pool.query(`
            INSERT INTO validated_cards (player_id, game_session_id, grid_numbers, room, serial_number)
            VALUES (?, ?, ?, 'bronce', ?)
        `, [user.id, sessionId, JSON.stringify(cardDataPaga), 'TEST-PAGA-' + Date.now()]);
        console.log(`🎫 Cartón Paga asignado: ID ${cardResultPaga.insertId}`);

        // 3b. Crear un cartón en card_pool (Sala Starter)
        const cardDataStarter = {
            rows: [
                [5, 15, 25, 35, 45, null, null, null, null],
                [6, 16, 26, 36, 46, null, null, null, null],
                [7, 17, 27, 37, 47, null, null, null, null]
            ]
        };

        const [cardResultStarter] = await pool.query(`
            INSERT INTO card_pool (id, session_id, numbers, reserved_by, serial, status)
            VALUES (?, ?, ?, ?, ?, 'reserved')
        `, ['TEST-CARD-STARTER-' + Date.now(), sessionId, JSON.stringify(cardDataStarter), user.id, 'ST-' + String(Date.now()).slice(-8)]);
        console.log(`🎫 Cartón Starter asignado: ID ${cardResultStarter.insertId}`);

        // 4. Instanciar Engine (Mock IO)
        const mockIO = {
            to: () => ({ emit: () => { } })
        };
        const engine = new GameEngineAuto(mockIO);

        // Mock state in engine
        engine.activeGames.set(sessionId, {
            gameSessionId: sessionId,
            ballsDrawn: [1, 11, 21, 31, 41, 5, 15, 25, 35, 45], // Bolillas para ganar LÍNEA en ambos
            availableBalls: [],
            roomId: 'bronce'
        });

        console.log('🔍 Verificando LÍNEA...');
        await engine.checkAllCardsForWinners(sessionId, 41);

        // 5. Verificar base de datos
        console.log('\n📊 Verificando Base de Datos...');
        const [databaseWinners] = await pool.query(`
            SELECT * FROM game_winners WHERE game_session_id = ? AND prize_type = "linea"
        `, [sessionId]);
        if (databaseWinners.length > 0) {
            console.log('✅ Ganador de LÍNEA detectado y registrado en DB!');
            console.log(`💰 Premio: $${databaseWinners[0].prize_amount}`);
        } else {
            console.log('❌ Error: Ganador de LÍNEA NO detectado.');
        }

        // 6. Verificar Balance
        const [userAfter] = await pool.query('SELECT balance FROM users WHERE id = ?', [user.id]);
        console.log(`💰 Balance anterior: ${user.balance} -> Nuevo balance: ${userAfter[0].balance}`);

        // 7. Simular BINGO
        console.log('🔍 Verificando BINGO...');
        const gameState = engine.activeGames.get(sessionId);
        gameState.ballsDrawn = [
            1, 11, 21, 31, 41,
            2, 12, 22, 32, 42,
            3, 13, 23, 33, 43
        ];

        await engine.checkAllCardsForWinners(sessionId, 43);

        const [bingoWinners] = await pool.query('SELECT * FROM game_winners WHERE game_session_id = ? AND (prize_type = "bingo" OR prize_type = "bingo_pre40")', [sessionId]);
        if (bingoWinners.length > 0) {
            console.log(`✅ BINGO detectado! Tipo: ${bingoWinners[0].prize_type}`);
        } else {
            console.log('❌ Error: BINGO NO detectado.');
        }

        console.log('\n✨ TEST FINALIZADO. Limpiando datos de prueba...');
        // await pool.query('DELETE FROM game_winners WHERE game_session_id = ?', [sessionId]);
        // await pool.query('DELETE FROM validated_cards WHERE game_session_id = ?', [sessionId]);
        // await pool.query('DELETE FROM card_pool WHERE session_id = ?', [sessionId]);
        // await pool.query('DELETE FROM game_sessions WHERE id = ?', [sessionId]);

    } catch (err) {
        console.error('❌ Error en el test:', err);
    } finally {
        process.exit(0);
    }
}

testOfflineWinners();
