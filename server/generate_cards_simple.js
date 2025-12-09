/**
 * Generador simple de cartones para testing
 * Genera 50 cartones básicos sin validaciones complejas
 */

const mysql = require('mysql2/promise');

// Generar números aleatorios para Bingo 90
function generateSimpleCard() {
  const card = [];
  
  // 3 filas x 9 columnas
  for (let row = 0; row < 3; row++) {
    const rowNumbers = [];
    
    for (let col = 0; col < 9; col++) {
      // Cada columna tiene un rango específico
      const min = col * 10 + (col === 0 ? 1 : 0);
      const max = col === 8 ? 90 : (col + 1) * 10 - 1;
      
      // 50% probabilidad de tener número en esta celda
      if (Math.random() > 0.4) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min;
        rowNumbers.push(num);
      } else {
        rowNumbers.push(null);
      }
    }
    
    card.push(rowNumbers);
  }
  
  return card;
}

async function generateCards() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
  });

  try {
    console.log('\n🎫 Generando 50 cartones simples...\n');

    const sessionId = 'starter_default';
    const timestamp = Date.now();
    const timestampBase36 = timestamp.toString(36).toUpperCase();

    for (let i = 0; i < 50; i++) {
      const card = generateSimpleCard();
      const serial = `24K-S${timestampBase36}-${String(i).padStart(6, '0')}`;
      const cardId = `${sessionId}_${i}`;
      
      const query = `
        INSERT INTO card_pool (id, session_id, serial, numbers, status, reserved_by, created_at)
        VALUES (?, ?, ?, ?, 'available', NULL, NOW())
        ON DUPLICATE KEY UPDATE numbers = VALUES(numbers)
      `;
      
      await connection.query(query, [
        cardId,
        sessionId,
        serial,
        JSON.stringify(card)
      ]);
      
      if ((i + 1) % 10 === 0) {
        console.log(`   ✅ ${i + 1}/50 cartones creados`);
      }
    }

    console.log('\n✅ 50 cartones generados exitosamente');
    console.log(`   Sesión: ${sessionId}`);
    console.log(`   Formato serial: 24K-S${timestampBase36}-XXXXXX\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

generateCards();
