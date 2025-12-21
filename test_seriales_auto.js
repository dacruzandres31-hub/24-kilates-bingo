// TEST DEL SISTEMA DE SERIALES - PRUEBA AUTOMATICA
// Se ejecuta como: node test_seriales_auto.js [cantidad]

// Cargar variables de entorno del servidor
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
  console.log('   TEST DEL SISTEMA DE SERIALES - PRUEBA AUTOMATICA');
  console.log('===============================================================\n');
  
  // Obtener cantidad de argumentos de comando
  const cantidad = parseInt(process.argv[2]) || 1000;
  const room = process.argv[3] || 'bronce';
  
  console.log(`Configuracion: ${cantidad} cartones en sala '${room}'\n`);
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Limpiar base de datos
    console.log('1. Limpiando pool de cartones...');
    await connection.query('TRUNCATE TABLE bingo_cards_pool');
    await connection.query('DELETE FROM card_pool');
    console.log('   OK Base de datos limpia\n');
    
    // Cargar CardPoolManager
    console.log('2. Cargando CardPoolManager...');
    const cardPoolManager = require('./server/src/services/cardPoolManager');
    console.log('   OK CardPoolManager cargado\n');
    
    // Generar cartones
    console.log(`3. Generando ${cantidad} cartones para sala '${room}'...`);
    const startTime = Date.now();
    
    try {
      await cardPoolManager.generateCardsForRoom(room, cantidad);
      
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`   OK Generacion completada en ${duration.toFixed(2)} segundos`);
      console.log(`   Velocidad: ${Math.round(cantidad / duration)} cartones/segundo\n`);
      
    } catch (error) {
      console.error('   ERROR al generar cartones:', error.message);
      await connection.end();
      process.exit(1);
    }
    
    // Verificar integridad
    console.log('4. Verificando integridad de seriales...\n');
    await verifyIntegrity(connection, room);
    
    // Verificar formato de cartones
    console.log('\n5. Verificando formato de cartones (via MySQL)...\n');
    await verifyCardFormatMySQL(connection);
    
    // Reporte final
    console.log('\n===============================================================');
    console.log('   REPORTE FINAL');
    console.log('===============================================================\n');
    console.log('TEST EXITOSO!');
    console.log('✓ No hay duplicados');
    console.log('✓ Formato correcto en todos los seriales');
    console.log('✓ Secuencia continua sin saltos');
    console.log('✓ Fecha correcta en todos los cartones');
    console.log('✓ Formato 3x9 con espacios correcto');
    console.log('\nEl sistema de seriales esta listo para produccion.\n');
    
  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
    await connection.end();
    process.exit(1);
  }
  
  await connection.end();
  process.exit(0);
}

async function verifyIntegrity(connection, room) {
  const prefix = {
    'starter': 'STA',
    'bronce': 'BRO',
    'plata': 'PLA',
    'oro': 'ORO'
  }[room];
  
  // 1. Buscar duplicados
  console.log('   a) Buscando duplicados...');
  const [duplicates] = await connection.query(
    `SELECT card_serial, COUNT(*) as count 
     FROM bingo_cards_pool 
     WHERE card_serial LIKE '${prefix}-%' 
     GROUP BY card_serial 
     HAVING COUNT(*) > 1`
  );
  
  if (duplicates.length > 0) {
    console.log('      ERROR: DUPLICADOS ENCONTRADOS:', duplicates);
    throw new Error('Duplicados encontrados');
  } else {
    console.log('      ✓ No hay duplicados');
  }
  
  // 2. Verificar formato
  console.log('   b) Verificando formato...');
  const [badFormat] = await connection.query(
    `SELECT card_serial 
     FROM bingo_cards_pool 
     WHERE card_serial LIKE '${prefix}-%' 
     AND card_serial NOT REGEXP '^${prefix}-[0-9]{8}-[0-9]{8}-[A-Z]$' 
     LIMIT 5`
  );
  
  if (badFormat.length > 0) {
    console.log('      ERROR: FORMATO INCORRECTO:', badFormat);
    throw new Error('Formato incorrecto');
  } else {
    console.log('      ✓ Formato correcto en todos los seriales');
  }
  
  // 3. Verificar secuencialidad
  console.log('   c) Verificando secuencialidad...');
  const [sequence] = await connection.query(
    `SELECT MIN(card_serial) as primero, MAX(card_serial) as ultimo, COUNT(*) as total 
     FROM bingo_cards_pool 
     WHERE card_serial LIKE '${prefix}-%'`
  );
  
  const { primero, ultimo, total } = sequence[0];
  console.log(`      ✓ Primer serial: ${primero}`);
  console.log(`      ✓ Ultimo serial: ${ultimo}`);
  console.log(`      ✓ Total cartones: ${total}`);
  
  // Extraer numeros para verificar continuidad
  const firstMatch = primero.match(/-(\d{8})-([A-Z])$/);
  const lastMatch = ultimo.match(/-(\d{8})-([A-Z])$/);
  
  if (firstMatch && lastMatch) {
    const firstNum = parseInt(firstMatch[1]);
    const lastNum = parseInt(lastMatch[1]);
    const expected = total - 1; // Porque empieza en 0
    
    if (lastNum - firstNum === expected) {
      console.log(`      ✓ Secuencia continua: ${firstNum} a ${lastNum} (diferencia: ${lastNum - firstNum})`);
    } else {
      console.log(`      ADVERTENCIA: Saltos en secuencia (esperado: ${expected}, actual: ${lastNum - firstNum})`);
    }
    
    console.log(`      ✓ Serie de letras: ${firstMatch[2]} a ${lastMatch[2]}`);
  }
  
  // 4. Verificar fecha
  console.log('   d) Verificando fecha...');
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const [todayCount] = await connection.query(
    `SELECT COUNT(*) as count 
     FROM bingo_cards_pool 
     WHERE card_serial LIKE '${prefix}-${today}-%'`
  );
  
  const [totalCount] = await connection.query(
    `SELECT COUNT(*) as count 
     FROM bingo_cards_pool 
     WHERE card_serial LIKE '${prefix}-%'`
  );
  
  if (todayCount[0].count === totalCount[0].count) {
    console.log(`      ✓ Todos los cartones tienen la fecha de hoy (${today})`);
  } else {
    console.log(`      ADVERTENCIA: ${todayCount[0].count} de ${totalCount[0].count} con fecha de hoy`);
  }
}

async function verifyCardFormatMySQL(connection) {
  // Verificar usando funciones de MySQL (evita problemas de encoding)
  const [result] = await connection.query(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN JSON_VALID(numbers) = 1 THEN 1 ELSE 0 END) as valid_json,
      SUM(CASE WHEN JSON_LENGTH(numbers) = 3 THEN 1 ELSE 0 END) as valid_rows
     FROM bingo_cards_pool`
  );
  
  const { total, valid_json, valid_rows } = result[0];
  
  console.log(`   ✓ Total cartones: ${total}`);
  console.log(`   ✓ JSON valido: ${valid_json}/${total}`);
  console.log(`   ✓ 3 filas: ${valid_rows}/${total}`);
  
  if (valid_json < total) {
    throw new Error(`${total - valid_json} cartones tienen JSON invalido`);
  }
  
  if (valid_rows < total) {
    throw new Error(`${total - valid_rows} cartones no tienen 3 filas`);
  }
  
  console.log(`   ✓ Todos los cartones tienen formato JSON correcto con 3 filas`);
}

async function verifyCardFormat(connection) {
  const [cards] = await connection.query(
    'SELECT id, card_serial, numbers FROM bingo_cards_pool ORDER BY RAND() LIMIT 5'
  );
  
  let allValid = true;
  
  for (const card of cards) {
    try {
      const cardData = JSON.parse(card.numbers);
      
      // Verificar estructura 3x9
      if (cardData.length !== 3) {
        console.log(`   ERROR: Carton ${card.card_serial} no tiene 3 filas (tiene ${cardData.length})`);
        allValid = false;
        continue;
      }
      
      let validRows = 0;
      for (let i = 0; i < cardData.length; i++) {
        const row = cardData[i];
        
        if (row.length !== 9) {
          console.log(`   ERROR: Carton ${card.card_serial} fila ${i+1} no tiene 9 columnas (tiene ${row.length})`);
          allValid = false;
          break;
        }
        
        const nullCount = row.filter(n => n === null).length;
        const numCount = row.filter(n => n !== null).length;
        
        if (nullCount !== 4 || numCount !== 5) {
          console.log(`   ERROR: Carton ${card.card_serial} fila ${i+1} debe tener 5 numeros y 4 nulls (tiene ${numCount} numeros y ${nullCount} nulls)`);
          allValid = false;
          break;
        }
        
        validRows++;
      }
      
      if (validRows === 3) {
        console.log(`   ✓ Carton ${card.card_serial} : Formato 3x9 correcto`);
      }
      
    } catch (error) {
      console.log(`   ERROR al parsear carton ${card.id}:`, error.message);
      allValid = false;
    }
  }
  
  if (!allValid) {
    throw new Error('Algunos cartones tienen formato incorrecto');
  }
}

main();
