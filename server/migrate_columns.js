/**
 * Migrar columnas de gamification_progress
 * Cambiar: current_xp -> xp_current, total_xp_lifetime -> xp_lifetime
 */

const pool = require('./src/db');

async function migrateColumns() {
  console.log('\n========================================');
  console.log('  VERIFICAR Y MIGRAR COLUMNAS');
  console.log('========================================\n');

  try {
    // Verificar columnas actuales
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM gamification_progress
    `);

    console.log('Columnas actuales:');
    columns.forEach(col => console.log(`  - ${col.Field}`));

    // Verificar si necesita migración
    const hasOldColumns = columns.some(c => c.Field === 'current_xp' || c.Field === 'total_xp_lifetime');
    const hasNewColumns = columns.some(c => c.Field === 'xp_current' || c.Field === 'xp_lifetime');

    if (hasNewColumns && !hasOldColumns) {
      console.log('\n✓ Las columnas ya están correctas (xp_current, xp_lifetime)');
    } else if (hasOldColumns && !hasNewColumns) {
      console.log('\n⚠️ Detectadas columnas antiguas, migrando...\n');
      
      // Renombrar columnas
      await pool.query('ALTER TABLE gamification_progress CHANGE current_xp xp_current INT NOT NULL DEFAULT 0');
      console.log('✓ current_xp -> xp_current');
      
      await pool.query('ALTER TABLE gamification_progress CHANGE total_xp_lifetime xp_lifetime INT NOT NULL DEFAULT 0');
      console.log('✓ total_xp_lifetime -> xp_lifetime');
      
      console.log('\n✓ Migración completada');
    } else {
      console.log('\n✓ Columnas mixtas, schema ya está actualizado');
    }

    // Verificar datos
    const [count] = await pool.query('SELECT COUNT(*) as count FROM gamification_progress');
    console.log(`\nRegistros en gamification_progress: ${count[0].count}`);

  } catch (error) {
    console.error('\n[ERROR]', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateColumns();
