const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function updateInventoryViews() {
    let conn;
    try {
        console.log('🔐 Conectando a la base de datos...\n');

        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'bingo2024',
            database: process.env.DB_NAME || 'bingo_24k',
            multipleStatements: true
        });

        console.log('✅ Conectado a la base de datos\n');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, '..', 'FIX_INVENTORY_VIEWS_INCLUDE_PLAYERS.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📄 Ejecutando script SQL para actualizar vistas...\n');

        // Ejecutar el script
        const [results] = await conn.query(sql);

        console.log('✅ Vistas actualizadas exitosamente\n');

        // Mostrar resultados de verificación
        if (Array.isArray(results)) {
            results.forEach((result, index) => {
                if (Array.isArray(result) && result.length > 0) {
                    console.log(`📊 Resultado ${index + 1}:`);
                    console.table(result);
                }
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (conn) {
            await conn.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

updateInventoryViews();
