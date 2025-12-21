// TEST DE TRANSICION DE LETRAS (A -> B)
// Verifica que al pasar 100,000,000 la letra cambie correctamente

require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'bingo2024',
  database: 'bingo_24k'
};

async function main() {
  console.log('\n===============================================================');
  console.log('   TEST DE TRANSICION DE LETRAS (A -> B)');
  console.log('===============================================================\n');
  console.log('Objetivo: Verificar cambio automatico de letra al pasar 100,000,000\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 1. Limpiar base de datos
    console.log('1. Limpiando base de datos...');
    await connection.query('TRUNCATE TABLE bingo_cards_pool');
    await connection.query('DELETE FROM card_pool');
    console.log('   OK Base de datos limpia\n');
    
    // 2. Insertar cartones cerca del limite
    console.log('2. Insertando cartones de prueba cerca del limite...');
    console.log('   Insertando carton en posicion 99,999,995 (letra A)');
    
    await connection.query(
      `INSERT INTO bingo_cards_pool (card_serial, room, numbers, status, created_at) 
       VALUES 
       ('BRO-20251221-99999995-A', 'bronce', '[[1,2,3,null,null,4,5,6,null],[null,null,7,8,9,null,null,10,11],[12,13,null,null,14,15,16,null,null]]', 'available', NOW())`
    );
    
    console.log('   OK Carton insertado\n');
    
    // 3. Cargar CardPoolManager y generar 10 cartones mas
    console.log('3. Generando 10 cartones adicionales...');
    console.log('   (deberian ser: 99999996-A, 99999997-A, 99999998-A, 99999999-A,');
    console.log('    00000000-B, 00000001-B, 00000002-B, 00000003-B, 00000004-B, 00000005-B)\n');
    
    const cardPoolManager = require('./server/src/services/cardPoolManager');
    
    const startTime = Date.now();
    await cardPoolManager.generateCardsForRoom('bronce', 10);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`   OK Generacion completada en ${duration.toFixed(2)} segundos\n`);
    
    // 4. Verificar los ultimos 11 seriales (el insertado + los 10 generados)
    console.log('4. Verificando seriales generados...\n');
    
    const [serials] = await connection.query(
      `SELECT card_serial, id 
       FROM bingo_cards_pool 
       WHERE room = 'bronce' 
       ORDER BY id ASC`
    );
    
    console.log('   Seriales en orden:');
    console.log('   ' + '='.repeat(60));
    
    let hasB = false;
    let lastA = null;
    let firstB = null;
    let transitionCorrect = true;
    
    for (let i = 0; i < serials.length; i++) {
      const serial = serials[i].card_serial;
      const match = serial.match(/BRO-(\d{8})-(\d{8})-([A-Z])$/);
      
      if (match) {
        const [, date, num, letter] = match;
        const numInt = parseInt(num);
        
        if (letter === 'B') {
          hasB = true;
          if (!firstB) {
            firstB = { serial, num: numInt };
          }
          
          // Verificar que la serie B empiece en 00000000
          if (firstB.serial === serial && numInt !== 0) {
            console.log(`   ADVERTENCIA: La serie B deberia empezar en 00000000, pero empieza en ${num}`);
            transitionCorrect = false;
          }
          
          console.log(`   ${i + 1}. ${serial} <- SERIE B!`);
        } else {
          if (letter === 'A') {
            lastA = { serial, num: numInt };
          }
          console.log(`   ${i + 1}. ${serial}`);
        }
      } else {
        console.log(`   ${i + 1}. ${serial} (formato desconocido)`);
      }
    }
    
    console.log('   ' + '='.repeat(60) + '\n');
    
    // 5. Analisis de resultados
    console.log('5. Analisis de transicion:\n');
    
    if (lastA) {
      console.log(`   Ultimo carton serie A: ${lastA.serial}`);
      console.log(`   Numero: ${lastA.num.toString().padStart(8, '0')}`);
      
      if (lastA.num === 99999999) {
        console.log('   OK El ultimo carton de la serie A es 99999999');
      } else {
        console.log(`   ADVERTENCIA: El ultimo carton de serie A deberia ser 99999999`);
      }
    }
    
    if (firstB) {
      console.log(`\n   Primer carton serie B: ${firstB.serial}`);
      console.log(`   Numero: ${firstB.num.toString().padStart(8, '0')}`);
      
      if (firstB.num === 0) {
        console.log('   OK El primer carton de la serie B es 00000000');
      } else {
        console.log(`   ADVERTENCIA: El primer carton de serie B deberia ser 00000000`);
      }
    }
    
    // 6. Verificar matematica de transicion
    console.log('\n6. Verificacion matematica:\n');
    
    if (lastA && firstB) {
      // Calcular posicion global
      const lastAGlobal = lastA.num;
      const firstBGlobal = 100000000 + firstB.num;
      
      console.log(`   Posicion global ultimo A: ${lastAGlobal.toLocaleString()}`);
      console.log(`   Posicion global primer B: ${firstBGlobal.toLocaleString()}`);
      console.log(`   Diferencia: ${(firstBGlobal - lastAGlobal).toLocaleString()}`);
      
      if (firstBGlobal - lastAGlobal === 1) {
        console.log('   OK La transicion es consecutiva (diferencia = 1)');
      } else {
        console.log(`   ADVERTENCIA: Deberia haber diferencia de 1, pero hay ${firstBGlobal - lastAGlobal}`);
        transitionCorrect = false;
      }
    }
    
    // 7. Verificar no duplicados
    console.log('\n7. Verificando duplicados...\n');
    
    const [duplicates] = await connection.query(
      `SELECT card_serial, COUNT(*) as count 
       FROM bingo_cards_pool 
       WHERE card_serial LIKE 'BRO-%' 
       GROUP BY card_serial 
       HAVING COUNT(*) > 1`
    );
    
    if (duplicates.length > 0) {
      console.log('   ERROR: Se encontraron duplicados:');
      duplicates.forEach(d => console.log(`   - ${d.card_serial} (${d.count} veces)`));
      transitionCorrect = false;
    } else {
      console.log('   OK No hay duplicados');
    }
    
    // 8. Reporte final
    console.log('\n===============================================================');
    console.log('   REPORTE FINAL');
    console.log('===============================================================\n');
    
    if (hasB && transitionCorrect) {
      console.log('TEST EXITOSO!');
      console.log('✓ Se detecto la transicion de letra A -> B');
      console.log('✓ El ultimo carton de serie A es 99999999');
      console.log('✓ El primer carton de serie B es 00000000');
      console.log('✓ La secuencia es continua sin saltos');
      console.log('✓ No hay duplicados');
      console.log('\nEl sistema de transicion de letras funciona correctamente.');
      console.log('Capacidad comprobada: 100,000,000 cartones por letra.');
      console.log('Con 26 letras (A-Z): 2,600,000,000 cartones por sala.\n');
    } else if (!hasB) {
      console.log('PRUEBA INCOMPLETA');
      console.log('✗ No se detecto la serie B');
      console.log('Posible causa: No se generaron suficientes cartones para cruzar el limite.\n');
    } else {
      console.log('PRUEBA CON ADVERTENCIAS');
      console.log('✓ Se detecto la serie B');
      console.log('✗ Hay inconsistencias en la transicion');
      console.log('Revisa los mensajes de advertencia arriba.\n');
    }
    
  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
    await connection.end();
    process.exit(1);
  }
  
  await connection.end();
  process.exit(0);
}

main();
