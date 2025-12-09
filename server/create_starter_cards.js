/**
 * Script para crear cartones de Starter directamente
 */

const pool = require('./src/db');
const cardPoolService = require('./src/services/cardPoolService');

async function createStarterCards() {
  try {
    console.log('🎫 Creando cartones para Starter...\n');

    // 1. Buscar o crear sesión activa
    const [sessions] = await pool.query(`
      SELECT id FROM game_sessions 
      WHERE room = 'starter' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    let sessionId;
    
    if (sessions.length === 0) {
      // Crear nueva sesión
      const [result] = await pool.query(`
        INSERT INTO game_sessions (
          room, 
          status, 
          start_time,
          current_pot_bingo,
          current_pot_linea,
          current_pot_jackpot
        ) VALUES (
          'starter',
          'pending',
          DATE_ADD(NOW(), INTERVAL 1 HOUR),
          0,
          0,
          0
        )
      `);
      sessionId = result.insertId;
      console.log(`✅ Nueva sesión creada: ID ${sessionId}`);
    } else {
      sessionId = sessions[0].id;
      console.log(`✅ Usando sesión existente: ID ${sessionId}`);
    }

    // 2. Verificar cartones existentes
    const [existingCards] = await pool.query(
      'SELECT COUNT(*) as count FROM card_pool WHERE session_id = ?',
      [sessionId]
    );

    if (existingCards[0].count >= 6) {
      console.log(`ℹ️  Ya existen ${existingCards[0].count} cartones`);
      console.log(`✅ Sesión ${sessionId} lista con cartones`);
      
      // Cargar en memoria
      await cardPoolService.loadPoolFromDB(sessionId);
      console.log('✅ Cartones cargados en memoria');
      
      process.exit(0);
    }

    // 3. Generar 6 cartones
    console.log('🎲 Generando 6 cartones nuevos...');
    const cardsGenerated = await cardPoolService.initializePool(
      sessionId,
      6,
      'starter'
    );

    console.log(`\n✅ ${cardsGenerated} cartones creados exitosamente`);
    console.log(`📍 Session ID: ${sessionId}`);
    console.log(`🎮 Ir a: http://localhost:5174/sala/starter`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createStarterCards();
