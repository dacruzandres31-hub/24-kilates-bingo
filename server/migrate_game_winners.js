const mysql = require('mysql2/promise');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

async function migrateGameWinnersSystem() {
  let connection;
  
  try {
    console.log('📦 Conectando a MySQL...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bingo_24k',
      multipleStatements: true
    });

    console.log('✅ Conexión exitosa\n');

    // Leer archivo SQL
    const sqlFile = path.join(__dirname, 'GAME_WINNERS_MIGRATION.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Dividir por DELIMITER para manejar triggers
    const blocks = [];
    let currentBlock = '';
    let inDelimiter = false;
    let customDelimiter = ';';

    sqlContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();

      // Detectar cambio de DELIMITER
      if (trimmedLine.startsWith('DELIMITER')) {
        if (currentBlock.trim()) {
          blocks.push(currentBlock.trim());
          currentBlock = '';
        }
        customDelimiter = trimmedLine.split(' ')[1];
        inDelimiter = (customDelimiter !== ';');
        return;
      }

      // Ignorar comentarios
      if (trimmedLine.startsWith('--') || !trimmedLine) {
        return;
      }

      currentBlock += line + '\n';

      // Detectar fin de bloque
      if (inDelimiter && line.includes(customDelimiter)) {
        blocks.push(currentBlock.replace(customDelimiter, '').trim());
        currentBlock = '';
      } else if (!inDelimiter && line.includes(';')) {
        const parts = currentBlock.split(';');
        parts.forEach(part => {
          if (part.trim()) {
            blocks.push(part.trim());
          }
        });
        currentBlock = '';
      }
    });

    if (currentBlock.trim()) {
      blocks.push(currentBlock.trim());
    }

    console.log(`📦 Procesando ${blocks.length} bloques SQL...\n`);

    // Ejecutar cada bloque
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      if (!block || block.length < 10) continue;

      try {
        // Identificar tipo de statement
        const blockLower = block.toLowerCase();
        let blockType = 'Statement';
        
        if (blockLower.includes('create table')) {
          const match = block.match(/create table (?:if not exists )?(\w+)/i);
          blockType = match ? `Tabla: ${match[1]}` : 'Tabla';
        } else if (blockLower.includes('create view') || blockLower.includes('create or replace view')) {
          const match = block.match(/view (\w+)/i);
          blockType = match ? `Vista: ${match[1]}` : 'Vista';
        } else if (blockLower.includes('create trigger')) {
          const match = block.match(/trigger (\w+)/i);
          blockType = match ? `Trigger: ${match[1]}` : 'Trigger';
        } else if (blockLower.includes('create index')) {
          const match = block.match(/index (\w+)/i);
          blockType = match ? `Índice: ${match[1]}` : 'Índice';
        }

        await connection.query(block);
        console.log(`✅ ${blockType} ejecutado`);

      } catch (err) {
        // Ignorar errores de "ya existe" pero mostrar otros
        if (err.code === 'ER_TABLE_EXISTS_ERROR' || 
            err.message.includes('already exists') ||
            err.message.includes('duplicate')) {
          console.log(`⚠️  ${block.substring(0, 50)}... ya existe (OK)`);
        } else {
          console.error(`❌ Error en bloque ${i + 1}:`, err.message);
          console.error('Bloque:', block.substring(0, 100) + '...');
        }
      }
    }

    // Verificar tablas creadas
    console.log('\n📋 Verificando estructura creada...\n');

    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
        AND table_name IN ('game_winners', 'game_session_balls')
      ORDER BY table_name
    `, [process.env.DB_NAME || 'bingo_24k']);

    console.log('✅ Tablas creadas:');
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    // Verificar vistas
    const [views] = await connection.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = ? 
        AND table_name LIKE 'v_%game%'
      ORDER BY table_name
    `, [process.env.DB_NAME || 'bingo_24k']);

    if (views.length > 0) {
      console.log('\n✅ Vistas creadas:');
      views.forEach(v => console.log(`   - ${v.table_name}`));
    }

    // Verificar triggers
    const [triggers] = await connection.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers 
      WHERE trigger_schema = ?
        AND event_object_table IN ('game_session_balls', 'game_winners')
      ORDER BY trigger_name
    `, [process.env.DB_NAME || 'bingo_24k']);

    if (triggers.length > 0) {
      console.log('\n✅ Triggers creados:');
      triggers.forEach(t => console.log(`   - ${t.trigger_name} (${t.event_manipulation} on ${t.event_object_table})`));
    }

    // Mostrar columnas de game_winners
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM game_winners
    `);

    console.log('\n📋 Columnas de game_winners:');
    columns.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });

    console.log('\n✅ Migración completada exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar migración
migrateGameWinnersSystem();
