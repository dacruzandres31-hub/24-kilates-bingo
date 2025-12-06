// Script temporal para ejecutar la migración de tickets
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('\n========================================');
  console.log('EJECUTANDO MIGRACION DE TICKETS v1.3.0');
  console.log('========================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k',
    multipleStatements: true
  });
  
  try {
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, 'TICKETS_PREMIOS_HIBRIDOS_MIGRATION_MYSQL.sql');
    console.log('[1/3] Leyendo archivo de migracion...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('  ✅ Archivo cargado (' + migrationSQL.length + ' caracteres)');

    // Ejecutar migración
    console.log('\n[2/3] Ejecutando migracion...');
    await connection.query(migrationSQL);
    console.log('  ✅ Migracion ejecutada exitosamente');

    // Verificar resultados
    console.log('\n[3/3] Verificando resultados...');
    
    // Verificar columnas en cosmetic_items
    const [cols1] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cosmetic_items' 
      AND COLUMN_NAME IN ('is_consumable', 'max_uses', 'ticket_room')
    `);
    console.log('  ✅ Columnas en cosmetic_items: ' + cols1[0].count + '/3');

    // Verificar columnas en user_inventory
    const [cols2] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_inventory' 
      AND COLUMN_NAME IN ('quantity', 'is_consumable_type')
    `);
    console.log('  ✅ Columnas en user_inventory: ' + cols2[0].count + '/2');

    // Verificar tabla game_events
    const [table1] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'game_events'
    `);
    console.log('  ✅ Tabla game_events: ' + (table1[0].count > 0 ? 'SI' : 'NO'));

    // Verificar tickets insertados
    const [tickets] = await connection.query(`
      SELECT id, name, rarity, ticket_room 
      FROM cosmetic_items 
      WHERE type='ticket'
    `);
    console.log('  ✅ Tickets insertados: ' + tickets.length + '/3');
    
    if (tickets.length > 0) {
      console.log('\n  Tickets encontrados:');
      tickets.forEach(ticket => {
        console.log('    - ' + ticket.name + ' (' + ticket.rarity + ', ' + ticket.ticket_room + ')');
      });
    }

    console.log('\n========================================');
    console.log('✅ MIGRACION COMPLETADA EXITOSAMENTE');
    console.log('========================================\n');

    console.log('📋 SIGUIENTE PASO:');
    console.log('  Ejecuta: node run_cosmetics_seed.js\n');
    console.log('📋 DESPUES:');
    console.log('  Inicia el servidor: npm run dev');
    console.log('  Revisa: TESTING_MANUAL_TICKETS.md\n');

  } catch (error) {
    console.error('\n❌ ERROR AL EJECUTAR MIGRACION:');
    console.error(error.message);
    console.error('\nDetalles:');
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
