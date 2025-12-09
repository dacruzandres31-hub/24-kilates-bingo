const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'bingo_24k'
  });

  try {
    console.log('🔄 Iniciando migración de contador global...');

    // Crear tabla de contador
    await connection.query(`
      CREATE TABLE IF NOT EXISTS global_card_counter (
        id INT PRIMARY KEY DEFAULT 1,
        counter BIGINT NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CHECK (id = 1)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla global_card_counter creada');

    // Insertar fila inicial
    await connection.query(`
      INSERT INTO global_card_counter (id, counter) 
      VALUES (1, 0)
      ON DUPLICATE KEY UPDATE counter = counter
    `);
    console.log('✅ Contador inicializado');

    // Agregar constraint UNIQUE en serial
    try {
      await connection.query(`
        ALTER TABLE card_pool 
        ADD UNIQUE KEY idx_serial_unique (serial)
      `);
      console.log('✅ Constraint UNIQUE agregado en card_pool.serial');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Constraint UNIQUE ya existe');
      } else {
        throw error;
      }
    }

    // Crear índice compuesto
    try {
      await connection.query(`
        CREATE INDEX idx_card_pool_session_serial ON card_pool(session_id, serial)
      `);
      console.log('✅ Índice compuesto creado');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Índice compuesto ya existe');
      } else {
        throw error;
      }
    }

    // Verificar
    const [rows] = await connection.query('SELECT * FROM global_card_counter');
    console.log('📊 Estado del contador:', rows[0]);

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration();
