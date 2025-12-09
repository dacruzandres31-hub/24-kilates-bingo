/**
 * Eliminar cartones defectuosos y crear nuevos
 */

const pool = require('./src/db');

async function fixStarterCards() {
  try {
    console.log('🔧 Corrigiendo cartones de Starter...\n');

    // 0. Primero eliminar cartones con session_id inválido
    const [deleteInvalid] = await pool.query(`
      DELETE FROM card_pool 
      WHERE session_id NOT REGEXP '^[0-9]+$'
    `);
    
    if (deleteInvalid.affectedRows > 0) {
      console.log(`🗑️  ${deleteInvalid.affectedRows} cartones con session_id inválido eliminados`);
    }

    // 1. Eliminar cartones con numbers NULL
    const [deleteResult] = await pool.query(`
      DELETE FROM card_pool 
      WHERE session_id = 20 
      AND (numbers IS NULL OR numbers = 'null' OR numbers = '')
    `);
    
    console.log(`🗑️  ${deleteResult.affectedRows} cartones defectuosos eliminados`);

    // 2. Verificar cuántos quedan
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM card_pool 
      WHERE session_id = 20
    `);

    console.log(`📊 Cartones restantes: ${countResult[0].count}`);

    if (countResult[0].count >= 6) {
      console.log('✅ Ya hay suficientes cartones válidos');
      process.exit(0);
    }

    // 3. Recrear los 6 cartones
    console.log('\n🎲 Generando 6 cartones nuevos...');
    
    const cardPoolService = require('./src/services/cardPoolService');
    await cardPoolService.initializePool(20, 6, 'starter');

    console.log('\n✅ ¡Cartones corregidos exitosamente!');
    console.log('🎮 Recarga la página y haz clic en SELECCIONAR CARTONES');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixStarterCards();
