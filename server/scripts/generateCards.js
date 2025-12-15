/**
 * Script para generar cartones de bingo para todas las salas
 * Genera 1000 cartones por sala (starter, bronce, plata, oro)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const BingoCardGenerator = require('../src/utils/cardGenerator');

// Configuración de BD
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bingo_24k',
  port: parseInt(process.env.DB_PORT) || 3306
};

const ROOMS = ['starter', 'bronce', 'plata', 'oro'];
const CARDS_PER_ROOM = 1000;

async function generateCardsForAllRooms() {
  let connection;
  
  try {
    console.log('🎯 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida\n');
    
    // Crear tabla si no existe
    console.log('📋 Creando tabla bingo_cards_pool si no existe...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bingo_cards_pool (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_serial VARCHAR(50) UNIQUE NOT NULL,
        room ENUM('starter', 'bronce', 'plata', 'oro') NOT NULL,
        numbers JSON NOT NULL COMMENT 'Matriz 3x9 del cartón',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('available', 'selected', 'used') DEFAULT 'available',
        selected_by INT NULL COMMENT 'ID del usuario que seleccionó el cartón',
        selected_at TIMESTAMP NULL,
        game_session_id INT NULL COMMENT 'ID de la sesión en la que se usó',
        
        INDEX idx_room_status (room, status),
        INDEX idx_serial (card_serial),
        INDEX idx_selected_by (selected_by),
        INDEX idx_room_available (room, status, id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Pool de cartones pre-generados para cada sala'
    `);
    
    console.log('✅ Tabla creada correctamente\n');
    
    for (const room of ROOMS) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📋 Generando cartones para sala: ${room.toUpperCase()}`);
      console.log('='.repeat(50));
      
      // Verificar cartones existentes
      const [existing] = await connection.query(
        'SELECT COUNT(*) as count FROM bingo_cards_pool WHERE room = ?',
        [room]
      );
      
      if (existing[0].count > 0) {
        console.log(`⚠️  Ya existen ${existing[0].count} cartones para ${room}`);
        console.log('   Puedes eliminarlos con: DELETE FROM bingo_cards_pool WHERE room = ?');
        continue;
      }
      
      // Generar cartones
      console.log(`🔄 Generando ${CARDS_PER_ROOM} cartones...`);
      const cards = BingoCardGenerator.generateBatch(room, CARDS_PER_ROOM);
      
      // Validar todos los cartones
      console.log('🔍 Validando cartones...');
      const invalidCards = cards.filter(card => !BingoCardGenerator.validateCard(card.numbers));
      
      if (invalidCards.length > 0) {
        console.log(`❌ Se encontraron ${invalidCards.length} cartones inválidos`);
        continue;
      }
      
      console.log('✅ Todos los cartones son válidos');
      
      // Insertar en base de datos por lotes
      console.log('💾 Insertando en base de datos...');
      const batchSize = 100;
      let inserted = 0;
      
      for (let i = 0; i < cards.length; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        const values = batch.map(card => [
          card.serial,
          card.room,
          JSON.stringify(card.numbers)
        ]);
        
        await connection.query(
          `INSERT INTO bingo_cards_pool (card_serial, room, numbers) 
           VALUES ?`,
          [values]
        );
        
        inserted += batch.length;
        process.stdout.write(`\r   Insertados: ${inserted}/${CARDS_PER_ROOM}`);
      }
      
      console.log('\n✅ Cartones insertados correctamente');
      
      // Mostrar estadísticas
      const [stats] = await connection.query(`
        SELECT 
          room,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as disponibles,
          MIN(created_at) as primer_carton,
          MAX(created_at) as ultimo_carton
        FROM bingo_cards_pool
        WHERE room = ?
        GROUP BY room
      `, [room]);
      
      console.log('\n📊 Estadísticas:');
      console.log(`   Total: ${stats[0].total}`);
      console.log(`   Disponibles: ${stats[0].disponibles}`);
      console.log(`   Primer cartón: ${stats[0].primer_carton}`);
      console.log(`   Último cartón: ${stats[0].ultimo_carton}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 GENERACIÓN COMPLETADA');
    console.log('='.repeat(50));
    
    // Resumen final
    const [summary] = await connection.query(`
      SELECT 
        room,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as disponibles
      FROM bingo_cards_pool
      GROUP BY room
      ORDER BY FIELD(room, 'starter', 'bronce', 'plata', 'oro')
    `);
    
    console.log('\n📊 RESUMEN FINAL:');
    summary.forEach(row => {
      console.log(`   ${row.room.padEnd(10)}: ${row.total} cartones (${row.disponibles} disponibles)`);
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexión cerrada');
    }
  }
}

// Ejecutar
generateCardsForAllRooms();
