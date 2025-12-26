const mysql = require('mysql2/promise');
require('dotenv').config();

async function createCardInventoryTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '24kilates',
        database: process.env.DB_NAME || 'bingo_24k'
    });

    try {
        console.log('🔄 Creando tabla card_inventory...');

        await connection.query(`
      CREATE TABLE IF NOT EXISTS card_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        room ENUM('bronce', 'plata', 'oro') NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        is_gift TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Regalo (no afecta pozos), 0 = Normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_user_room (user_id, room),
        INDEX idx_user_gift (user_id, is_gift),
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        CHECK (quantity >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

        console.log('✅ Tabla card_inventory creada exitosamente');

        // Verificar que la tabla existe
        const [tables] = await connection.query(`SHOW TABLES LIKE 'card_inventory'`);
        console.log('📋 Verificación:', tables.length > 0 ? 'Tabla existe' : 'Tabla NO existe');

    } catch (error) {
        console.error('❌ Error creando tabla:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

createCardInventoryTable()
    .then(() => {
        console.log('✅ Migración completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migración fallida:', error);
        process.exit(1);
    });
