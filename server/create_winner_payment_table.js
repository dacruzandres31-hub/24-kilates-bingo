const fs = require('fs');
const pool = require('./src/db');

async function createWinnerPaymentTable() {
  try {
    console.log('📦 Creando tabla winner_payment_info...');
    const sql = fs.readFileSync('CREATE_WINNER_PAYMENT_INFO.sql', 'utf8');
    
    // Dividir en bloques DELIMITER
    const blocks = sql.split('DELIMITER');
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (!block) continue;
      
      if (block.startsWith('//')) {
        const content = block.substring(2).trim();
        const endDelimiter = content.lastIndexOf('//');
        if (endDelimiter > 0) {
          const actualSQL = content.substring(0, endDelimiter).trim();
          if (actualSQL) {
            try {
              await pool.query(actualSQL);
              console.log('✅ Trigger/Procedimiento ejecutado');
            } catch (e) {
              if (!e.message.includes('already exists')) {
                console.log('⚠️  Error:', e.message.substring(0, 80));
              }
            }
          }
        }
      } else {
        const statements = block.split(';').filter(s => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) {
            try {
              await pool.query(stmt.trim());
              console.log('✅ Statement ejecutado');
            } catch (e) {
              if (!e.message.includes('already exists') && 
                  !e.message.includes('check that it exists')) {
                console.log('⚠️  Error:', e.message.substring(0, 80));
              }
            }
          }
        }
      }
    }
    
    console.log('✅ Tabla winner_payment_info creada exitosamente');
    
    // Verificar tabla
    const [cols] = await pool.query('SHOW COLUMNS FROM winner_payment_info');
    console.log('\n📋 Columnas creadas:');
    cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createWinnerPaymentTable();
