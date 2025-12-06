/**
 * Ejecutar schema completo MySQL
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function executeCompleteSchema() {
  console.log('\n========================================');
  console.log('  EJECUTANDO SCHEMA COMPLETO');
  console.log('========================================\n');

  let connection;

  try {
    // Cargar variables de entorno
    require('dotenv').config();

    // Conectar sin seleccionar DB
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('✓ Conectado a MySQL\n');

    // Leer schema completo
    const schemaPath = path.join(__dirname, 'schema_completo_mysql.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Ejecutar todo el schema
    console.log('Ejecutando schema_completo_mysql.sql...\n');
    
    await connection.query(schema);
    
    console.log('✓ Schema ejecutado exitosamente\n');

    // Verificar tablas creadas
    await connection.query('USE bingo_24k');
    const [tables] = await connection.query('SHOW TABLES');
    
    console.log('========================================');
    console.log('  TABLAS CREADAS');
    console.log('========================================\n');
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`  ${tableName}: ${count[0].count} registros`);
    }

    console.log('\n========================================');
    console.log('  VERIFICACION CRITICA');
    console.log('========================================\n');

    const critical = [
      'users',
      'bingo_cards',
      'chips_movements',
      'withdrawal_requests',
      'gamification_progress',
      'levels_config',
      'daily_quests'
    ];

    let allOk = true;
    for (const table of critical) {
      try {
        const [result] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ✓ ${table}: OK (${result[0].count} registros)`);
      } catch (err) {
        console.log(`  ✗ ${table}: FALTA`);
        allOk = false;
      }
    }

    if (allOk) {
      console.log('\n✓ Todas las tablas críticas existen\n');
    } else {
      console.log('\n✗ Faltan tablas críticas\n');
    }

  } catch (error) {
    console.error('\n[ERROR]', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

executeCompleteSchema();
