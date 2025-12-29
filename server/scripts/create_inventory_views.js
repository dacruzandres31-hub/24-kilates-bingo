const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function createInventoryViews() {
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
        const sqlPath = path.join(__dirname, '..', 'FIX_INVENTORY_VIEW_NULL_ISSUE.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📄 Ejecutando script SQL para crear vistas...\n');

        // Ejecutar el script
        await conn.query(sql);

        console.log('✅ Vistas creadas exitosamente:');
        console.log('   - v_superadmin_inventory');
        console.log('   - v_admin_inventory\n');

        // Verificar que las vistas existen
        const [views] = await conn.query(`
      SELECT TABLE_NAME 
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA = 'bingo_24k' 
      AND TABLE_NAME IN ('v_superadmin_inventory', 'v_admin_inventory')
    `);

        console.log('🔍 Vistas encontradas en la base de datos:');
        views.forEach(view => {
            console.log(`   ✓ ${view.TABLE_NAME}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (conn) {
            await conn.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

createInventoryViews();
