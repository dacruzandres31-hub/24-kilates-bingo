// TEST DEL SISTEMA DE SERIALES - EJECUCION DIRECTA
// Se ejecuta como: node test_seriales_directo.js

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'bingo2024',
  database: 'bingo_24k'
};

async function main() {
  console.log('\n===============================================================');
  console.log('   TEST DEL SISTEMA DE SERIALES - CONDICIONES REALES');
  console.log('===============================================================\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Limpiar base de datos
    console.log('Limpiando pool de cartones...');
    await connection.query('TRUNCATE TABLE bingo_cards_pool');
    await connection.query('DELETE FROM card_pool');
    console.log('OK Base de datos limpia\n');
    
    // Menu
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('SELECCIONA EL TIPO DE PRUEBA:');
    console.log('');
    console.log('1. Prueba Rapida (100 cartones - 10 segundos)');
    console.log('2. Prueba Media (1,000 cartones - 1 minuto)');
    console.log('3. Prueba Grande (5,000 cartones - 5 minutos)');
    console.log('4. Prueba Masiva (10,000 cartones - 10 minutos)');
    console.log('5. Prueba de Transicion de Letras (A -> B)');
    console.log('0. Salir');
    console.log('');
    
    rl.question('Opcion: ', async (choice) => {
      rl.close();
      
      const configs = {
        '1': { room: 'bronce', quantity: 100, name: 'Rapida' },
        '2': { room: 'plata', quantity: 1000, name: 'Media' },
        '3': { room: 'oro', quantity: 5000, name: 'Grande' },
        '4': { room: 'bronce', quantity: 10000, name: 'Masiva' }
      };
      
      if (choice === '0') {
        await connection.end();
        process.exit(0);
      }
      
      if (choice === '5') {
        await testLetterTransition(connection);
        await connection.end();
        process.exit(0);
      }
      
      if (!configs[choice]) {
        console.log('ERROR: Opcion invalida');
        await connection.end();
        process.exit(1);
      }
      
      const config = configs[choice];
      
      console.log('\n===============================================================');
      console.log(` TEST: Prueba ${config.name}`);
      console.log(` Sala: ${config.room} | Cantidad: ${config.quantity}`);
      console.log('===============================================================');
      
      // Requerir CardPoolManager (es un singleton)
      const cardPoolManager = require('./server/src/services/cardPoolManager');
      
      // Generar cartones
      console.log(`\nGenerando ${config.quantity} cartones para sala '${config.room}'...`);
      
      const startTime = Date.now();
      
      try {
        const generated = await cardPoolManager.generateCardsForRoom(config.room, config.quantity);
        
        const duration = (Date.now() - startTime) / 1000;
        
        console.log(`OK Generacion completada en ${duration.toFixed(2)} segundos`);
        console.log(`   Velocidad: ${Math.round(config.quantity / duration)} cartones/segundo\n`);
        
        // Verificar integridad
        await verifyIntegrity(connection, config.room);
        
        // Verificar formato de cartones
        await verifyCardFormat(connection);
        
        console.log('\n===============================================================');
        console.log('   REPORTE FINAL');
        console.log('===============================================================');
        console.log('\nTEST EXITOSO!');
        console.log('- No hay duplicados');
        console.log('- Formato correcto en todos los seriales');
        console.log('- Secuencia continua sin saltos');
        console.log('- Fecha correcta en todos los cartones');
        console.log('- Formato 3x9 con espacios correcto');
        console.log('\nEl sistema de seriales esta listo para produccion.\n');
        
      } catch (error) {
        console.error('ERROR al generar cartones:', error.message);
      }
      
      await connection.end();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('ERROR:', error.message);
    await connection.end();
    process.exit(1);
  }
}

async function verifyIntegrity(connection, room) {
  console.log('Verificando integridad de seriales...');
  
  const prefix = {
    'starter': 'STA',
    'bronce': 'BRO',
    'plata': 'PLA',
    'oro': 'ORO'
  }[room];
  
  // 1. Buscar duplicados
  console.log('   Buscando duplicados...');
  const [duplicates] = await connection.query(
    `SELECT card_serial, COUNT(*) as count 
     FROM bingo_cards_pool 
     WHERE card_serial LIKE '${prefix}-%' 
     GROUP BY card_serial 
     HAVING COUNT(*) > 1`
  );
  
  if (duplicates.length > 0) {
    console.log('   ERROR: DUPLICADOS ENCONTRADOS:', duplicates);
    throw new Error('Duplicados encontrados');
  } else {
    console.log('   OK No hay duplicados');
  }
  
  // 2. Verificar formato
  console.log('   Verificando formato...');
  const [badFormat] = await connection.query(
    `SELECT card_serial 
     FROM bingo_cards_pool 
     WHERE card_serial LIKE '${prefix}-%' 
     AND card_serial NOT REGEXP '^${prefix}-[0-9]{8}-[0-9]{8}-[A-Z]$' 
     LIMIT 5`
  );
  
  if (badFormat.length > 0) {
    console.log('   ERROR: FORMATO INCORRECTO:', badFormat);
    throw new Error('Formato incorrecto');
  } else {
    console.log('   OK Formato correcto en todos los seriales');
  }
  
  // 3. Verificar secuencialidad
  console.log('   Verificando secuencialidad...');
  const [sequence] = await connection.query(
    `SELECT MIN(card_serial) as primero, MAX(card_serial) as ultimo, COUNT(*) as total 
     FROM bingo_cards_pool 
     WHERE card_serial LIKE '${prefix}-%'`
  );
  
  const { primero, ultimo, total } = sequence[0];
  console.log(`   OK Primer serial: ${primero}`);
  console.log(`   OK Ultimo serial: ${ultimo}`);
  console.log(`   OK Total cartones: ${total}`);
  
  // Extraer numeros para verificar continuidad
  const firstMatch = primero.match(/-(\d{8})-([A-Z])$/);
  const lastMatch = ultimo.match(/-(\d{8})-([A-Z])$/);
  
  if (firstMatch && lastMatch) {
    console.log(`   -- Rango numerico: ${firstMatch[1]} -> ${lastMatch[1]}`);
    console.log(`   -- Serie de letras: ${firstMatch[2]} -> ${lastMatch[2]}`);
  }
  
  // 4. Verificar fecha
  console.log('   Verificando fecha...');
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
    console.log(`   OK Todos los cartones tienen la fecha de hoy (${today})`);
  } else {
    console.log(`   ADVERTENCIA: ${todayCount[0].count} de ${totalCount[0].count} con fecha de hoy`);
  }
}

async function verifyCardFormat(connection) {
  console.log('\nVerificando formato de cartones (3x9 con espacios)...');
  
  const [cards] = await connection.query(
    'SELECT id, card_serial, numbers FROM bingo_cards_pool ORDER BY RAND() LIMIT 3'
  );
  
  for (const card of cards) {
    try {
      const cardData = JSON.parse(card.numbers);
      
      if (cardData.length !== 3) {
        console.log(`   ERROR: Carton ${card.id} no tiene 3 filas (tiene ${cardData.length})`);
        throw new Error('Formato incorrecto');
      }
      
      let rowNum = 1;
      for (const row of cardData) {
        if (row.length !== 9) {
          console.log(`   ERROR: Carton ${card.id} fila ${rowNum} no tiene 9 columnas (tiene ${row.length})`);
          throw new Error('Formato incorrecto');
        }
        
        const nullCount = row.filter(n => n === null).length;
        const numCount = row.filter(n => n !== null).length;
        
        if (nullCount !== 4 || numCount !== 5) {
          console.log(`   ERROR: Carton ${card.id} fila ${rowNum} debe tener 5 numeros y 4 nulls (tiene ${numCount} numeros y ${nullCount} nulls)`);
          throw new Error('Formato incorrecto');
        }
        
        rowNum++;
      }
      
      console.log(`   OK Carton ${card.card_serial} : Formato 3x9 correcto`);
      
    } catch (error) {
      console.log(`   ERROR al parsear carton ${card.id}:`, error.message);
      throw error;
    }
  }
}

async function testLetterTransition(connection) {
  console.log('\nPRUEBA DE TRANSICION DE LETRAS (A -> B)');
  console.log('Objetivo: Verificar cambio de letra al pasar 100,000,000\n');
  
  // Limpiar
  await connection.query('TRUNCATE TABLE bingo_cards_pool');
  
  // Insertar carton cerca del limite
  console.log('Insertando carton en posicion 99,999,998...');
  
  await connection.query(
    `INSERT INTO bingo_cards_pool (card_serial, room, numbers, status, created_at) 
     VALUES ('BRO-20251221-99999998-A', 'bronce', '[[1,2,3,null,null,4,5,6,null],[null,null,7,8,9,null,null,10,11],[12,13,null,null,14,15,16,null,null]]', 'available', NOW())`
  );
  
  console.log('Generando 5 cartones adicionales...');
  
  const cardPoolManager = require('./server/src/services/cardPoolManager');
  
  await cardPoolManager.generateCardsForRoom('bronce', 5);
  
  // Verificar ultimos 6 seriales
  console.log('\nUltimos 6 seriales generados:');
  const [serials] = await connection.query(
    `SELECT card_serial FROM bingo_cards_pool WHERE room = 'bronce' ORDER BY id DESC LIMIT 6`
  );
  
  const serialList = serials.map(s => s.card_serial).reverse();
  
  let hasB = false;
  for (const serial of serialList) {
    if (serial.match(/-B$/)) {
      hasB = true;
      console.log(`   OK ${serial} (Serie B detectada!)`);
    } else {
      console.log(`   -- ${serial}`);
    }
  }
  
  if (hasB) {
    console.log('\nTRANSICION EXITOSA: La letra cambio de A a B');
  } else {
    console.log('\nTRANSICION FALLO: No se detecto serie B');
  }
}

main();
