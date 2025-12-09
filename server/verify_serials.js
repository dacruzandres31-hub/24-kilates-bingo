const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifySerials() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'bingo_24k'
  });

  try {
    console.log('\n========================================');
    console.log('   VERIFICACIÓN DE SERIALES ÚNICOS');
    console.log('========================================\n');

    // Total de cartones
    const [total] = await connection.query('SELECT COUNT(*) as count FROM card_pool');
    console.log(`📊 Total de cartones en BD: ${total[0].count}`);

    // Seriales únicos
    const [unique] = await connection.query('SELECT COUNT(DISTINCT serial) as count FROM card_pool');
    console.log(`📊 Seriales únicos: ${unique[0].count}`);

    // Ejemplos de seriales
    const [examples] = await connection.query('SELECT serial, status, reserved_by FROM card_pool ORDER BY id LIMIT 10');
    console.log('\n📝 Ejemplos de seriales (primeros 10):\n');
    examples.forEach((row, i) => {
      const status = row.status === 'reserved' ? `[RESERVADO por user ${row.reserved_by}]` : '[DISPONIBLE]';
      console.log(`  ${i+1}. ${row.serial} ${status}`);
    });

    // Verificar duplicados
    const [duplicates] = await connection.query(`
      SELECT serial, COUNT(*) as count 
      FROM card_pool 
      GROUP BY serial 
      HAVING COUNT(*) > 1
    `);

    console.log(`\n🔍 Seriales duplicados: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('❌ ATENCIÓN: Se encontraron seriales duplicados:');
      duplicates.forEach(row => {
        console.log(`   ${row.serial}: ${row.count} veces`);
      });
    } else {
      console.log('✅ PERFECTO: Todos los seriales son únicos');
    }

    // Contador global
    const [counter] = await connection.query('SELECT * FROM global_card_counter');
    console.log(`\n📊 Contador global actual: ${counter[0].counter}`);
    console.log(`📅 Última actualización: ${counter[0].last_updated}`);

    // Sesiones activas
    const [sessions] = await connection.query(`
      SELECT session_id, COUNT(*) as cards, 
             SUM(CASE WHEN status='reserved' THEN 1 ELSE 0 END) as reserved
      FROM card_pool 
      GROUP BY session_id
    `);

    console.log('\n📊 Sesiones activas:');
    sessions.forEach(row => {
      console.log(`  ${row.session_id}: ${row.cards} cartones (${row.reserved} reservados)`);
    });

    console.log('\n========================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

verifySerials();
