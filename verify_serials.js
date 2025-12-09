/**
 * Verificador de seriales únicos para el sistema de cartones
 * Confirma que cada cartón en la BD tiene un serial único
 */

const mysql = require('mysql2/promise');

async function verifySerials() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
  });

  try {
    console.log('\n🔍 Verificando seriales de cartones...\n');

    // 1. Verificar que el contador está funcionando
    const [counter] = await connection.query('SELECT counter FROM global_card_counter WHERE id = 1');
    console.log(`✅ Contador global actual: ${counter[0].counter}`);

    // 2. Contar total de cartones
    const [totalCards] = await connection.query('SELECT COUNT(*) as total FROM card_pool');
    console.log(`📊 Total de cartones en BD: ${totalCards[0].total}`);

    // 3. Verificar que no hay seriales duplicados
    const [duplicates] = await connection.query(`
      SELECT serial, COUNT(*) as count 
      FROM card_pool 
      GROUP BY serial 
      HAVING count > 1
    `);
    
    if (duplicates.length > 0) {
      console.log(`\n❌ ATENCIÓN: Se encontraron ${duplicates.length} seriales duplicados:`);
      duplicates.forEach(d => {
        console.log(`   - Serial "${d.serial}" aparece ${d.count} veces`);
      });
    } else {
      console.log(`✅ Todos los seriales son únicos (0 duplicados)`);
    }

    // 4. Mostrar últimos 10 cartones generados
    const [recentCards] = await connection.query(`
      SELECT id, serial, session_id, reserved_by, created_at 
      FROM card_pool 
      ORDER BY id DESC 
      LIMIT 10
    `);

    console.log('\n📋 Últimos 10 cartones generados:');
    recentCards.forEach(card => {
      const reserved = card.reserved_by ? `(Reservado por user ${card.reserved_by})` : '(Disponible)';
      console.log(`   ${card.serial} - Sesión: ${card.session_id} ${reserved}`);
    });

    // 5. Verificar formato de seriales
    const [allSerials] = await connection.query('SELECT serial FROM card_pool');
    const correctFormat = allSerials.filter(s => s.serial.startsWith('24K-S'));
    const oldFormat = allSerials.filter(s => !s.serial.startsWith('24K-S'));

    console.log(`\n🎯 Formatos de serial:`);
    console.log(`   ✅ Formato correcto (24K-S...): ${correctFormat.length}`);
    if (oldFormat.length > 0) {
      console.log(`   ⚠️  Formato antiguo: ${oldFormat.length}`);
      console.log(`   Ejemplos: ${oldFormat.slice(0, 3).map(s => s.serial).join(', ')}`);
    }

    // 6. Verificar integridad de foreign keys
    const [orphanCards] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM card_pool 
      WHERE reserved_by IS NOT NULL 
      AND reserved_by NOT IN (SELECT id FROM users)
    `);

    if (orphanCards[0].count > 0) {
      console.log(`\n⚠️  Hay ${orphanCards[0].count} cartones reservados por usuarios inexistentes`);
    } else {
      console.log(`\n✅ Todas las reservas apuntan a usuarios válidos`);
    }

    console.log('\n✅ Verificación completa\n');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Ejecutar verificación
verifySerials().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
