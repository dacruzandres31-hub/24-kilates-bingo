/**
 * Ejecutar schema base completo
 * Ejecuta schema.sql en bloques seguros
 */

const fs = require('fs');
const path = require('path');
const pool = require('./src/db');

async function executeSchema() {
  console.log('\n========================================');
  console.log('  EJECUTANDO SCHEMA BASE');
  console.log('========================================\n');

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('[ERROR] schema.sql no encontrado');
      process.exit(1);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Dividir por CREATE TABLE
    const tableCreations = schemaSQL.split(/CREATE TABLE IF NOT EXISTS/i);
    
    console.log(`Total de bloques encontrados: ${tableCreations.length - 1}\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 1; i < tableCreations.length; i++) {
      const block = 'CREATE TABLE IF NOT EXISTS' + tableCreations[i];
      
      // Extraer nombre de tabla
      const match = block.match(/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?/i);
      const tableName = match ? match[1] : `tabla_${i}`;
      
      // Encontrar el final del CREATE TABLE (punto y coma seguido de salto o fin)
      const endMatch = block.search(/;\s*(\n|$)/);
      const statement = endMatch > 0 ? block.substring(0, endMatch + 1) : block;
      
      try {
        await pool.query(statement);
        console.log(`[${i}/${tableCreations.length - 1}] ✓ ${tableName} creada`);
        successCount++;
      } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`[${i}/${tableCreations.length - 1}] - ${tableName} ya existe`);
          skipCount++;
        } else {
          console.error(`[${i}/${tableCreations.length - 1}] ✗ ${tableName}: ${err.message}`);
          errorCount++;
        }
      }
    }

    console.log('\n========================================');
    console.log('  RESUMEN');
    console.log('========================================');
    console.log(`Creadas: ${successCount}`);
    console.log(`Existentes: ${skipCount}`);
    console.log(`Errores: ${errorCount}`);

    // Verificar tablas críticas
    console.log('\n========================================');
    console.log('  VERIFICACION FINAL');
    console.log('========================================\n');

    const criticalTables = [
      'users',
      'bingo_cards',
      'game_sessions',
      'chips_movements',
      'gamification_progress',
      'levels_config',
      'daily_quests'
    ];

    for (const table of criticalTables) {
      try {
        const [result] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✓ ${table}: ${result[0].count} registros`);
      } catch (err) {
        console.log(`✗ ${table}: NO EXISTE`);
      }
    }

    console.log('\n========================================');
    console.log('  SCHEMA EJECUTADO');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n[ERROR FATAL]', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executeSchema();
