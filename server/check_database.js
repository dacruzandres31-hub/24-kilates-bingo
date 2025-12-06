/**
 * Verificar estado de la base de datos
 */

const pool = require('./src/db');

async function checkDatabase() {
  console.log('\n========================================');
  console.log('  ESTADO DE LA BASE DE DATOS');
  console.log('========================================\n');

  try {
    // Mostrar todas las tablas
    const [tables] = await pool.query("SHOW TABLES");
    console.log(`Total de tablas: ${tables.length}\n`);
    
    console.log('Tablas existentes:');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [count] = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`  - ${tableName}: ${count[0].count} registros`);
    }

    console.log('\n========================================');
    console.log('  TABLAS REQUERIDAS');
    console.log('========================================\n');

    const requiredTables = [
      'users',
      'bingo_cards',
      'game_sessions',
      'chips_movements',
      'withdrawal_requests',
      'gamification_progress',
      'levels_config',
      'daily_quests',
      'weekly_rankings',
      'user_inventory',
      'cosmetics_catalog',
      'achievements'
    ];

    console.log('Estado:');
    for (const table of requiredTables) {
      try {
        const [result] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ✓ ${table}: ${result[0].count} registros`);
      } catch (err) {
        console.log(`  ✗ ${table}: NO EXISTE`);
      }
    }

  } catch (error) {
    console.error('\n[ERROR]', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
