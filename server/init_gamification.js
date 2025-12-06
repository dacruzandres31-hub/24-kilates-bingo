/**
 * Inicializar gamificación para usuarios existentes
 */

const pool = require('./src/db');

async function initGamification() {
  console.log('\n========================================');
  console.log('  INICIALIZAR GAMIFICACION');
  console.log('========================================\n');

  try {
    // Obtener usuarios sin gamificación
    const [users] = await pool.query(`
      SELECT u.id, u.username, u.role
      FROM users u
      LEFT JOIN gamification_progress gp ON u.id = gp.user_id
      WHERE gp.user_id IS NULL AND u.role = 'jugador'
    `);

    console.log(`Usuarios sin gamificación: ${users.length}\n`);

    for (const user of users) {
      console.log(`Inicializando ${user.username}...`);
      
      // Crear progreso
      await pool.query(`
        INSERT INTO gamification_progress (user_id, current_level, xp_current, xp_lifetime)
        VALUES (?, 1, 0, 0)
      `, [user.id]);

      // Crear quests iniciales
      await pool.query(`
        INSERT INTO daily_quests (user_id, quest_name, quest_type, target_value, xp_reward)
        VALUES 
          (?, 'Primera victoria', 'WIN', 1, 100),
          (?, 'Jugar 3 partidas', 'PLAY', 3, 50),
          (?, 'Completar un cartón', 'COMPLETE_CARD', 1, 75)
      `, [user.id, user.id, user.id]);

      console.log(`  ✓ ${user.username} inicializado\n`);
    }

    // Verificar resultados
    const [progressCount] = await pool.query('SELECT COUNT(*) as count FROM gamification_progress');
    const [questsCount] = await pool.query('SELECT COUNT(*) as count FROM daily_quests');

    console.log('========================================');
    console.log('  RESULTADO');
    console.log('========================================');
    console.log(`  Progreso inicializado: ${progressCount[0].count} usuarios`);
    console.log(`  Quests creadas: ${questsCount[0].count} quests`);
    console.log('\n✓ Gamificación inicializada exitosamente\n');

  } catch (error) {
    console.error('\n[ERROR]', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initGamification();
