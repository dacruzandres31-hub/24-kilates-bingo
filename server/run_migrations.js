/**
 * Script para ejecutar migraciones SQL pendientes
 * Ejecuta: WITHDRAWAL_REQUESTS_MIGRATION.sql
 */

const fs = require('fs');
const path = require('path');
const pool = require('./src/db');

async function runMigrations() {
  console.log('\n========================================');
  console.log('  EJECUTANDO MIGRACIONES SQL');
  console.log('========================================\n');

  try {
    // 1. WITHDRAWAL_REQUESTS_MIGRATION.sql
    console.log('[1/3] Ejecutando WITHDRAWAL_REQUESTS_MIGRATION.sql...');
    const withdrawalSQL = fs.readFileSync(
      path.join(__dirname, 'WITHDRAWAL_REQUESTS_MIGRATION.sql'),
      'utf8'
    );
    
    // Separar por statements (punto y coma + salto de línea)
    const statements = withdrawalSQL
      .split(/;\s*\n/)
      .filter(stmt => {
        const trimmed = stmt.trim();
        return trimmed && 
               !trimmed.startsWith('--') && 
               !trimmed.startsWith('/*') &&
               trimmed !== 'USE bingo_24k';
      });

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        try {
          await pool.query(stmt);
          console.log(`   Statement ${i + 1}/${statements.length} ejecutado`);
        } catch (err) {
          if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME') {
            console.log(`   Statement ${i + 1} ya existe (ignorado)`);
          } else {
            console.error(`   ERROR en statement ${i + 1}:`, err.message);
          }
        }
      }
    }
    console.log('[OK] Migration completada\n');

    // 2. Agregar seller_id a bingo_cards si no existe
    console.log('[2/3] Agregando seller_id a bingo_cards...');
    try {
      await pool.query(`
        ALTER TABLE bingo_cards 
        ADD COLUMN seller_id INT NULL,
        ADD CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('[OK] Columna seller_id agregada\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('[OK] seller_id ya existe (ignorado)\n');
      } else {
        console.error('[ERROR]', err.message, '\n');
      }
    }

    // 3. Crear trigger para auto-inicializar gamification_progress
    console.log('[3/3] Creando trigger de gamificacion...');
    try {
      // Eliminar trigger si existe
      await pool.query('DROP TRIGGER IF EXISTS after_user_insert_gamification');
      
      // Crear nuevo trigger
      await pool.query(`
        CREATE TRIGGER after_user_insert_gamification
        AFTER INSERT ON users
        FOR EACH ROW
        BEGIN
          -- Solo para jugadores
          IF NEW.role = 'jugador' THEN
            -- Inicializar progreso de gamificación
            INSERT INTO gamification_progress (user_id, current_level, xp_current, xp_lifetime)
            VALUES (NEW.id, 1, 0, 0);
            
            -- Crear quests iniciales (3 misiones)
            INSERT INTO daily_quests (user_id, quest_name, quest_type, target_value, current_value, xp_reward)
            VALUES 
              (NEW.id, 'Primera victoria', 'WIN', 1, 0, 100),
              (NEW.id, 'Jugar 3 partidas', 'PLAY', 3, 0, 50),
              (NEW.id, 'Completar un carton', 'COMPLETE_CARD', 1, 0, 75);
          END IF;
        END
      `);
      console.log('[OK] Trigger creado exitosamente\n');
    } catch (err) {
      console.error('[ERROR]', err.message, '\n');
    }

    // Verificar tablas
    console.log('========================================');
    console.log('  VERIFICACION DE TABLAS');
    console.log('========================================\n');

    const [tables] = await pool.query("SHOW TABLES");
    console.log(`Total de tablas: ${tables.length}`);
    
    // Verificar withdrawal_requests
    try {
      const [result] = await pool.query("SELECT COUNT(*) as count FROM withdrawal_requests");
      console.log(`- withdrawal_requests: ${result[0].count} registros`);
    } catch (err) {
      console.log('- withdrawal_requests: NO EXISTE');
    }

    // Verificar gamification_progress
    const [gProgress] = await pool.query("SELECT COUNT(*) as count FROM gamification_progress");
    console.log(`- gamification_progress: ${gProgress[0].count} registros`);

    // Verificar daily_quests
    const [quests] = await pool.query("SELECT COUNT(*) as count FROM daily_quests");
    console.log(`- daily_quests: ${quests[0].count} registros`);

    console.log('\n========================================');
    console.log('  MIGRACIONES COMPLETADAS');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n[ERROR FATAL]', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
