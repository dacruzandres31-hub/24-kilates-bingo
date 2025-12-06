const fs = require('fs');
const pool = require('./src/db');

async function migrateWithdrawalFunctions() {
  try {
    console.log('📦 Leyendo archivo de migración...');
    const sql = fs.readFileSync('WITHDRAWAL_REQUESTS_MIGRATION.sql', 'utf8');
    
    // Dividir en bloques DELIMITER
    const blocks = sql.split('DELIMITER');
    
    console.log(`📝 Procesando ${blocks.length} bloques...`);
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (!block) continue;
      
      // Si es un bloque con //
      if (block.startsWith('//')) {
        const content = block.substring(2).trim();
        const endDelimiter = content.lastIndexOf('//');
        if (endDelimiter > 0) {
          const actualSQL = content.substring(0, endDelimiter).trim();
          if (actualSQL) {
            try {
              await pool.query(actualSQL);
              console.log('✅ Bloque ejecutado');
            } catch (e) {
              if (!e.message.includes('already exists') && 
                  !e.message.includes('Unknown column')) {
                console.log('⚠️  Error:', e.message.substring(0, 80));
              }
            }
          }
        }
      } else {
        // Bloque normal con ;
        const statements = block.split(';').filter(s => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) {
            try {
              await pool.query(stmt.trim());
            } catch (e) {
              if (!e.message.includes('already exists') && 
                  !e.message.includes('Unknown column')) {
                console.log('⚠️  Error:', e.message.substring(0, 80));
              }
            }
          }
        }
      }
    }
    
    console.log('✅ Migración completada');
    
    // Probar función
    const [result] = await pool.query('SELECT get_minutes_since_last_credit(1) as minutes');
    console.log('🧪 Test de función:', result[0].minutes, 'minutos');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrateWithdrawalFunctions();
