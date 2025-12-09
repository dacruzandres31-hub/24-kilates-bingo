/**
 * Test completo del flujo de seriales desde BD hasta frontend
 */

const mysql = require('mysql2/promise');

async function testSerialFlow() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
  });

  try {
    console.log('\n🧪 PRUEBA DE FLUJO DE SERIALES\n');

    // 1. Verificar seriales en BD
    const [cards] = await connection.query(`
      SELECT id, serial, session_id, reserved_by, JSON_LENGTH(numbers) as has_numbers
      FROM card_pool 
      ORDER BY id DESC 
      LIMIT 5
    `);

    console.log('📊 Últimos 5 cartones en BD:');
    cards.forEach(card => {
      const status = card.reserved_by ? `[Reservado por user ${card.reserved_by}]` : '[Disponible]';
      console.log(`   ${card.serial} - Session: ${card.session_id} - Números: ${card.has_numbers ? 'Sí' : 'No'} ${status}`);
    });

    // 2. Simular lo que devuelve el endpoint /available-cards
    const [availableCards] = await connection.query(`
      SELECT id, serial, numbers, status, reserved_by, session_id
      FROM card_pool 
      WHERE status = 'available' 
      AND session_id = 'test-session-001'
      LIMIT 3
    `);

    console.log('\n📤 Lo que devuelve /available-cards (primeros 3):');
    availableCards.forEach(card => {
      console.log(`   ID: ${card.id}`);
      console.log(`   Serial: ${card.serial}`);
      console.log(`   Tiene números: ${card.numbers ? 'Sí' : 'No'}`);
      console.log('');
    });

    // 3. Verificar formato de JSON numbers
    if (availableCards.length > 0 && availableCards[0].numbers) {
      const numbersJson = typeof availableCards[0].numbers === 'string' 
        ? JSON.parse(availableCards[0].numbers)
        : availableCards[0].numbers;
      
      console.log('🔢 Estructura de números del primer cartón:');
      console.log(`   Tipo: ${typeof numbersJson}`);
      console.log(`   Es array: ${Array.isArray(numbersJson)}`);
      console.log(`   Filas: ${numbersJson.length}`);
      if (numbersJson.length > 0) {
        console.log(`   Columnas por fila: ${numbersJson[0].length}`);
        console.log(`   Primera fila: [${numbersJson[0].join(', ')}]`);
      }
    }

    // 4. Verificar que no hay NULL en numbers
    const [nullNumbers] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM card_pool 
      WHERE numbers IS NULL OR numbers = 'null'
    `);

    if (nullNumbers[0].count > 0) {
      console.log(`\n⚠️  HAY ${nullNumbers[0].count} CARTONES CON NÚMEROS NULL`);
    } else {
      console.log(`\n✅ Todos los cartones tienen números válidos`);
    }

    // 5. Verificar consistencia serial <-> id
    const [duplicateSerials] = await connection.query(`
      SELECT serial, COUNT(*) as count 
      FROM card_pool 
      GROUP BY serial 
      HAVING count > 1
    `);

    if (duplicateSerials.length > 0) {
      console.log(`\n❌ HAY ${duplicateSerials.length} SERIALES DUPLICADOS:`);
      duplicateSerials.forEach(d => {
        console.log(`   "${d.serial}" aparece ${d.count} veces`);
      });
    } else {
      console.log(`\n✅ Todos los seriales son únicos`);
    }

    console.log('\n✅ Prueba de flujo completada\n');

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

testSerialFlow().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
