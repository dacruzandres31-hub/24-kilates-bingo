// Script temporal para insertar cosméticos
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runCosmeticsSeed() {
  console.log('\n========================================');
  console.log('INSERTANDO COSMETICOS');
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
    // Leer archivo de seed
    const seedPath = path.join(__dirname, 'cosmetics_seed.sql');
    console.log('[1/2] Leyendo archivo de cosmeticos...');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    console.log('  ✅ Archivo cargado (' + seedSQL.length + ' caracteres)');

    // Ejecutar seed
    console.log('\n[2/2] Insertando cosmeticos...');
    await connection.query(seedSQL);
    console.log('  ✅ Cosmeticos insertados exitosamente');

    // Verificar resultados
    console.log('\nVerificando resultados...');
    
    const [cosmetics] = await connection.query(`
      SELECT type, COUNT(*) as count 
      FROM cosmetic_items 
      GROUP BY type 
      ORDER BY type
    `);
    
    console.log('  Cosmeticos por tipo:');
    cosmetics.forEach(row => {
      console.log('    - ' + row.type + ': ' + row.count);
    });

    console.log('\n========================================');
    console.log('✅ COSMETICOS INSERTADOS');
    console.log('========================================\n');

    console.log('📋 SIGUIENTE PASO:');
    console.log('  Inicia el servidor: npm run dev');
    console.log('  Revisa: TESTING_MANUAL_TICKETS.md\n');

  } catch (error) {
    if (error.message.includes('Duplicate entry')) {
      console.log('\n⚠️  NOTA: Algunos cosmeticos ya existian (esto es normal)');
      console.log('✅ Puedes continuar con los siguientes pasos\n');
    } else {
      console.error('\n❌ ERROR AL INSERTAR COSMETICOS:');
      console.error(error.message);
      process.exit(1);
    }
  } finally {
    await connection.end();
  }
}

runCosmeticsSeed();
