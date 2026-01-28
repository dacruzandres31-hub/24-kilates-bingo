const cron = require('node-cron');
const pool = require('../db');
const stockManager = require('./stockManager');
const dailyGenerator = require('./dailyGenerator');
const questManager = require('./quest_manager');
const rankingEngine = require('./ranking_engine');
const membershipService = require('./membershipService');
const sessionWatchdog = require('./sessionWatchdog');

/**
 * SCHEDULER - Orquestación de Cron Jobs
 * 
 * Jobs:
 * 1. T-5 Closure (5 min antes de partida) - Bloquear ventas + limpiar cartones viejos
 * 2. Auto-Draw Starter - Cada minuto, verificar sesiones pendientes y arrancar sorteo
 * 3. Health Check - Verificar integridad del sistema cada 6 horas
 * 4. Weekly Ranking Reset - Lunes 00:00 calcular ranking y acreditar bonos
 * 5. Daily Quests Refresh - 00:01 crear nuevas misiones para todos
 * 6. Graceful Shutdown - Parar crons limpios
 */

class Scheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
    this.gameEngine = null; // Se inyecta desde index.js
  }

  /**
   * Inyectar referencia al GameEngine para auto-start
   */
  setGameEngine(gameEngine) {
    this.gameEngine = gameEngine;
    console.log('[Scheduler] 🎮 GameEngine inyectado correctamente');
  }

  /**
   * INICIO - Arrancar scheduler con todos los jobs
   */
  start() {
    if (this.isRunning) {
      console.log('[Scheduler] Ya está corriendo');
      return;
    }

    console.log('[Scheduler] Iniciando...');
    this.isRunning = true;

    // =========================================================================
    // MASTER SCHEDULE JOB - Cada 10 segundos verifica estados de sesiones
    // - T-5 min: Cierra ventas (status = 'closing')
    // - T-1 min: Iniciando (status = 'starting')
    // - T-0: Inicia sorteo (status = 'playing')
    // =========================================================================
    const masterScheduleJob = cron.schedule('*/10 * * * * *', async () => {
      try {
        await this.masterScheduleCheck();
      } catch (error) {
        console.error('[Scheduler] Master Schedule error:', error.message);
      }
    });
    this.jobs.push({ name: 'Master Schedule', job: masterScheduleJob });
    console.log('[Scheduler] Job registrado: ⏰ Master Schedule (cada 10 segundos)');

    // JOB: Session Creator - Cada minuto, crear sesiones según schedule_settings
    const sessionCreatorJob = cron.schedule('* * * * *', async () => {
      try {
        await this.createScheduledSessions();
      } catch (error) {
        console.error('[Scheduler] Session Creator error:', error.message);
      }
    });
    this.jobs.push({ name: 'Session Creator', job: sessionCreatorJob });
    console.log('[Scheduler] Job registrado: 📅 Session Creator (cada minuto)');

    // JOB 2: Weekly Ranking Reset (Lunes 00:00)
    const weeklyRankingJob = cron.schedule('0 0 * * 1', async () => {
      try {
        console.log('[Scheduler] Ejecutando: Weekly Ranking Reset');
        await rankingEngine.calculateWeeklyRanking();
        console.log('[Scheduler] ✅ Weekly Ranking Reset completado');
      } catch (error) {
        console.error('[Scheduler] Weekly Ranking error:', error.message);
      }
    });
    this.jobs.push({ name: 'Weekly Ranking Reset', job: weeklyRankingJob });
    console.log('[Scheduler] Job registrado: Weekly Ranking Reset (Lunes 00:00)');

    // JOB 3: Daily Quests Refresh (00:01 cada día)
    const dailyQuestsJob = cron.schedule('1 0 * * *', async () => {
      try {
        console.log('[Scheduler] Ejecutando: Daily Quests Refresh');

        // Obtener todos los jugadores
        const [playersResult] = await pool.query(
          `SELECT id FROM users WHERE role = 'jugador'`
        );

        let refreshedCount = 0;
        for (const player of playersResult) {
          await questManager.createDailyQuests(player.id);
          refreshedCount++;
        }

        console.log(`[Scheduler] ✅ Daily Quests Refresh: ${refreshedCount} jugadores`);
      } catch (error) {
        console.error('[Scheduler] Daily Quests error:', error.message);
      }
    });
    this.jobs.push({ name: 'Daily Quests Refresh', job: dailyQuestsJob });
    console.log('[Scheduler] Job registrado: Daily Quests Refresh (00:01 diario)');

    // JOB 3: Stock Health Check (cada 6 horas)
    const healthJob = cron.schedule('0 */6 * * *', async () => {
      try {
        await this.executeHealthCheck();
      } catch (error) {
        console.error('[Scheduler] Health check error:', error.message);
      }
    });
    this.jobs.push({ name: 'Health Check', job: healthJob });
    console.log('[Scheduler] Job registrado: Health Check (cada 6h)');

    // JOB: Cleanup Expired (cada día a las 00:05)
    const cleanupJob = cron.schedule('5 0 * * *', async () => {
      try {
        await this.executeExpiredStockCleanup();
      } catch (error) {
        console.error('[Scheduler] Cleanup error:', error.message);
      }
    });
    this.jobs.push({ name: 'Expired Stock Cleanup', job: cleanupJob });
    console.log('[Scheduler] Job registrado: Cleanup Cartones Expirados (00:05 hs)');

    // JOB: Ghost Cards Cleanup (cada 6 horas - limpieza de cartones fantasma)
    const ghostCleanupJob = cron.schedule('30 */6 * * *', async () => {
      try {
        console.log('[Scheduler] Ejecutando: Ghost Cards Cleanup');
        const stats = await sessionWatchdog.cleanupGhostCards();
        console.log(`[Scheduler] ✅ Ghost Cleanup: ${stats.ghostCardsFromBingoCards} cartones fantasma eliminados`);
      } catch (error) {
        console.error('[Scheduler] Ghost Cleanup error:', error.message);
      }
    });
    this.jobs.push({ name: 'Ghost Cards Cleanup', job: ghostCleanupJob });
    console.log('[Scheduler] Job registrado: Ghost Cards Cleanup (cada 6h, :30 min)');

    // JOB: Membership Daily Benefits (00:10 cada día - entregar cartones/spins a miembros VIP)
    const membershipBenefitsJob = cron.schedule('10 0 * * *', async () => {
      try {
        console.log('[Scheduler] Ejecutando: Membership Daily Benefits');
        await membershipService.resetDailyBenefits();
        console.log('[Scheduler] ✅ Membership Daily Benefits completado');
      } catch (error) {
        console.error('[Scheduler] Membership Benefits error:', error.message);
      }
    });
    this.jobs.push({ name: 'Membership Daily Benefits', job: membershipBenefitsJob });
    console.log('[Scheduler] Job registrado: Membership Benefits (00:10 diario)');

    // JOB: Sala Starter Free-to-Play (19:00 diariamente)
    const starterJob = cron.schedule('0 19 * * *', async () => {
      try {
        await this.createStarterSession();
      } catch (error) {
        console.error('[Scheduler] Starter Session error:', error.message);
      }
    });
    this.jobs.push({ name: 'Starter Free Session', job: starterJob });
    console.log('[Scheduler] Job registrado: Sala Starter (19:00 hs)');

    console.log('[Scheduler] ✅ Todos los jobs iniciados correctamente');

    // RECUPERACIÓN: Al iniciar, verificar si hay sesiones 'playing' huérfanas
    // Si el servidor se reinició durante un sorteo, retomarlo o cerrarlo
    setTimeout(async () => {
      await this.recoverOrphanedSessions();
    }, 5000); // Esperar 5 segundos para que todo esté inicializado
  }

  /**
   * RECUPERACIÓN DE SESIONES HUÉRFANAS
   * Si el servidor se reinició durante un sorteo activo, las sesiones quedan
   * en estado 'playing' pero sin intervalo. Esta función:
   * 1. Detecta sesiones 'playing' sin sorteo activo
   * 2. Si llevan más de 20 minutos → las marca como completadas (timeout)
   * 3. Si llevan menos de 20 minutos → intenta retomar el sorteo
   */
  async recoverOrphanedSessions() {
    try {
      console.log('[Scheduler] 🔍 Verificando sesiones huérfanas...');

      const [orphanedSessions] = await pool.query(`
        SELECT id, room, status, bingo_ball_index, start_time,
               TIMESTAMPDIFF(MINUTE, start_time, NOW()) as minutes_elapsed
        FROM game_sessions 
        WHERE status = 'playing'
        ORDER BY start_time DESC
      `);

      if (orphanedSessions.length === 0) {
        console.log('[Scheduler] ✅ No hay sesiones huérfanas');
        return;
      }

      console.log(`[Scheduler] ⚠️ Encontradas ${orphanedSessions.length} sesiones 'playing'`);

      for (const session of orphanedSessions) {
        const ballsDrawn = session.bingo_ball_index || 0;
        const minutesElapsed = session.minutes_elapsed || 0;

        console.log(`[Scheduler] 📋 Sesión #${session.id} (${session.room}): ${ballsDrawn} bolas, ${minutesElapsed} min`);

        // CASO 1: Sorteo terminado (90 bolas) pero quedó en 'playing'
        if (ballsDrawn >= 90) {
          console.log(`[Scheduler] 🏁 Sesión #${session.id} completada (${ballsDrawn}/90 bolas) - Cerrando`);
          await pool.query(
            `UPDATE game_sessions SET status = 'completed' WHERE id = ?`,
            [session.id]
          );
          continue;
        }

        // CASO 2: Más de 20 minutos sin actividad = timeout
        if (minutesElapsed > 20) {
          console.log(`[Scheduler] ⏰ Sesión #${session.id} timeout (${minutesElapsed} min) - Marcando como completada`);
          await pool.query(
            `UPDATE game_sessions SET status = 'completed' WHERE id = ?`,
            [session.id]
          );
          continue;
        }

        // CASO 3: Menos de 20 minutos y no terminó - Intentar retomar
        if (this.gameEngine) {
          console.log(`[Scheduler] 🔄 Retomando sorteo de sesión #${session.id} (${ballsDrawn} bolas ya sorteadas)`);
          try {
            await this.gameEngine.startGame(session.id, { autoStart: true });
            console.log(`[Scheduler] ✅ Sorteo #${session.id} retomado exitosamente`);
          } catch (err) {
            console.error(`[Scheduler] ❌ Error retomando sorteo #${session.id}:`, err.message);
            // Si no se puede retomar, marcar como completada
            await pool.query(
              `UPDATE game_sessions SET status = 'completed' WHERE id = ?`,
              [session.id]
            );
          }
        } else {
          console.log(`[Scheduler] ⚠️ GameEngine no disponible - Cerrando sesión #${session.id}`);
          await pool.query(
            `UPDATE game_sessions SET status = 'completed' WHERE id = ?`,
            [session.id]
          );
        }
      }

      console.log('[Scheduler] ✅ Recuperación de sesiones huérfanas completada');
    } catch (error) {
      console.error('[Scheduler] Error en recuperación de sesiones:', error.message);
    }
  }

  /**
   * Crear sesión gratis Sala Starter a las 19:00
   * Generar 20 cartones gratuitos para jugar
   */
  async createStarterSession() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startTime = new Date();
      startTime.setHours(19, 0, 0, 0);

      // Verificar si ya existe sesión hoy
      const [checkResult] = await pool.query(
        `SELECT id FROM game_sessions 
         WHERE room = 'starter' AND DATE(start_time) = ?`,
        [today]
      );

      if (checkResult.length > 0) {
        console.log('[Scheduler] Sala Starter ya existe para hoy');
        return;
      }

      const connection = await pool.getConnection();
      try {
        await connection.query('START TRANSACTION');

        // 1. Crear sesión
        const [sessionResult] = await connection.query(
          `INSERT INTO game_sessions (room, start_time, status, current_pot_bingo, current_pot_linea, current_pot_jackpot, is_preventa)
           VALUES ('starter', ?, 'pending', 0.00, 0.00, 0.00, false)`,
          [startTime]
        );

        const sessionId = sessionResult.insertId;

        // 2. Generar 20 cartones gratuitos
        const gridNumbers = generateBingoGrid();
        for (let i = 1; i <= 20; i++) {
          await connection.query(
            `INSERT INTO daily_stock_cards 
             (room, serial_number, grid_numbers, play_date, play_time, status, price)
             VALUES ('starter', ?, ?, ?, '19:00:00', 'available', 0.00)`,
            [i, JSON.stringify(gridNumbers), today]
          );
        }

        await connection.query('COMMIT');
        console.log(`✅ Sala Starter creada: Sesión #${sessionId} con 20 cartones gratuitos`);

        // 3. IMPORTANTE: Asignar cartones de bingo_cards_pool a esta sesión
        // Los cartones en bingo_cards_pool son los que valida gameEngineAuto
        await this.assignCardsToSession('starter', sessionId);
        console.log(`✅ Cartones de bingo_cards_pool asignados a sesión starter #${sessionId}`);

      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[Scheduler] createStarterSession error:', error);
    }
  }

  /**
   * MASTER SCHEDULE CHECK - Controla transiciones de estado según horarios
   * Ejecuta cada 10 segundos para precisión
   * 
   * Estados:
   * - pending: Sesión creada, ventas abiertas
   * - closing: T-5 min, ventas cerradas
   * - starting: T-1 min, cuenta regresiva visual
   * - playing: T-0, sorteo en curso
   */
  async masterScheduleCheck() {
    try {
      const now = new Date();

      // Obtener sesiones pendientes/closing/starting que tienen start_time
      const [sessions] = await pool.query(`
        SELECT id, room, status, start_time 
        FROM game_sessions 
        WHERE status IN ('pending', 'closing', 'starting')
          AND start_time IS NOT NULL
        ORDER BY start_time ASC
      `);

      for (const session of sessions) {
        const startTime = new Date(session.start_time);
        const secondsUntilStart = (startTime - now) / 1000;
        const minutesUntilStart = secondsUntilStart / 60;

        // ====== T-0: HORA EXACTA - INICIAR SORTEO ======
        if (secondsUntilStart <= 0 && session.status !== 'playing') {
          // Verificar que no haya otro sorteo activo DE LA MISMA SALA
          // (Cada sala puede tener su propio sorteo en paralelo)
          const [sameRoomPlaying] = await pool.query(
            `SELECT id FROM game_sessions WHERE room = ? AND status = 'playing' LIMIT 1`,
            [session.room]
          );
          
          if (sameRoomPlaying.length > 0) {
            console.log(`[MasterSchedule] ⏳ Esperando: ${session.room} #${session.id} (ya hay sorteo activo en esta sala)`);
            continue;
          }

          console.log(`[MasterSchedule] 🎱 T-0 HORA EXACTA: Iniciando sorteo ${session.room} #${session.id}`);
          
          await pool.query(
            `UPDATE game_sessions SET status = 'active' WHERE id = ?`,
            [session.id]
          );

          // Notificar a clientes que el sorteo va a empezar
          if (this.gameEngine && this.gameEngine.io) {
            this.gameEngine.io.to(`game_${session.room}`).emit('game_starting', {
              sessionId: session.id,
              room: session.room,
              message: '¡El sorteo está comenzando!'
            });
          }

          // Arrancar el motor de juego
          if (this.gameEngine) {
            await this.gameEngine.startGame(session.id, { autoStart: true });
            console.log(`[MasterSchedule] ✅ Sorteo iniciado: ${session.room} #${session.id}`);
          }
          continue;
        }

        // ====== T-1: UN MINUTO ANTES - ESTADO "INICIANDO" ======
        if (minutesUntilStart <= 1 && minutesUntilStart > 0 && session.status !== 'starting') {
          console.log(`[MasterSchedule] ⏱️ T-1: ${session.room} #${session.id} - Estado INICIANDO (${secondsUntilStart.toFixed(0)}s)`);
          
          await pool.query(
            `UPDATE game_sessions SET status = 'starting' WHERE id = ?`,
            [session.id]
          );

          // Notificar a clientes con cuenta regresiva
          if (this.gameEngine && this.gameEngine.io) {
            this.gameEngine.io.to(`game_${session.room}`).emit('countdown_start', {
              sessionId: session.id,
              room: session.room,
              secondsRemaining: Math.ceil(secondsUntilStart),
              message: '¡Prepárate! El sorteo comienza pronto'
            });
          }
          continue;
        }

        // ====== T-5: CINCO MINUTOS ANTES - CERRAR VENTAS ======
        if (minutesUntilStart <= 5 && minutesUntilStart > 1 && session.status === 'pending') {
          console.log(`[MasterSchedule] 🔒 T-5: ${session.room} #${session.id} - Cerrando ventas (${minutesUntilStart.toFixed(1)} min)`);
          
          await pool.query(
            `UPDATE game_sessions SET status = 'closing' WHERE id = ?`,
            [session.id]
          );

          // Liberar cartones no vendidos y asignarlos a la próxima sesión
          await this.releaseUnsoldCardsToNextSession(session.id, session.room);

          // Notificar a clientes que ventas están cerradas
          if (this.gameEngine && this.gameEngine.io) {
            this.gameEngine.io.to(`game_${session.room}`).emit('sales_closed', {
              sessionId: session.id,
              room: session.room,
              minutesRemaining: Math.ceil(minutesUntilStart),
              message: 'Las ventas están cerradas. El sorteo comenzará pronto.'
            });
          }
          continue;
        }
      }

      // Emitir actualizaciones de cuenta regresiva cada 10 segundos para sesiones 'starting'
      const [startingSessions] = await pool.query(
        `SELECT id, room, start_time FROM game_sessions WHERE status = 'starting'`
      );

      for (const session of startingSessions) {
        const startTime = new Date(session.start_time);
        const secondsRemaining = Math.max(0, Math.ceil((startTime - now) / 1000));

        if (this.gameEngine && this.gameEngine.io) {
          this.gameEngine.io.to(`game_${session.room}`).emit('countdown_update', {
            sessionId: session.id,
            room: session.room,
            secondsRemaining,
            message: secondsRemaining > 0 ? `Comienza en ${secondsRemaining}s` : '¡Comenzando!'
          });
        }
      }

    } catch (error) {
      console.error('[MasterSchedule] Error:', error.message);
    }
  }

  /**
   * Verifica y ejecuta closure T-5 si corresponde
   * NOTA: Esta función ahora es legacy, la lógica está en masterScheduleCheck
   * Se mantiene por compatibilidad
   */
  async checkAndExecuteT5Closure() {
    // La lógica ahora está en masterScheduleCheck()
    // Esta función se mantiene vacía por compatibilidad
  }

  /**
   * SESSION CREATOR - Nueva lógica de preparación anticipada
   * 
   * Flujo:
   * 1. Cuando sala está en 'playing' → Crear próxima sesión + asignar cartones disponibles
   * 2. Cuando sorteo termina → Cartones usados se archivan, próxima sesión queda lista
   * 3. En T-5 (closing) → Cartones no vendidos se liberan para próxima sesión
   * 
   * Esto garantiza que siempre hay una sesión preparada mientras otra está sorteando.
   */
  async createScheduledSessions() {
    try {
      const rooms = ['starter', 'bronce', 'plata', 'oro'];
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

      for (const room of rooms) {
        try {
          // Mapear room a formato de BD (ahora unificado)
          const roomMap = {
            'starter': 'starter',
            'free_starter': 'starter',
            'bronce': 'bronce',
            'plata': 'plata',
            'oro': 'oro'
          };
          const dbRoom = roomMap[room] || room;

          // Verificar estado actual de la sala
          const [currentSession] = await pool.query(`
            SELECT id, status, start_time FROM game_sessions 
            WHERE room = ? 
              AND status IN ('pending', 'closing', 'starting', 'active', 'playing', 'waiting')
            ORDER BY start_time DESC
            LIMIT 1
          `, [dbRoom]);

          // ====== CASO 1: Sala está SORTEANDO - Crear próxima sesión ======
          if (currentSession.length > 0 && currentSession[0].status === 'playing') {
            // Verificar si ya existe la próxima sesión preparada
            const [nextSession] = await pool.query(`
              SELECT id, status FROM game_sessions 
              WHERE room = ? 
                AND status = 'pending'
                AND start_time > NOW()
              ORDER BY start_time ASC
              LIMIT 1
            `, [dbRoom]);

            if (nextSession.length === 0) {
              // No hay próxima sesión, crearla
              const nextTime = await this.calculateNextScheduledTime(room, now);
              
              if (nextTime) {
                // Verificar que no exista duplicado para ese horario
                const [duplicateCheck] = await pool.query(`
                  SELECT id FROM game_sessions 
                  WHERE room = ? AND start_time = ? 
                    AND status NOT IN ('completed', 'finished', 'cancelled')
                  LIMIT 1
                `, [dbRoom, nextTime]);

                if (duplicateCheck.length === 0) {
                  // Obtener Pre-40 acumulado para esta sala
                  const accumulatedPre40 = await this.getAccumulatedPre40(dbRoom);
                  
                  const [sessionResult] = await pool.query(`
                    INSERT INTO game_sessions 
                    (room, start_time, status, current_pot_bingo, current_pot_linea, current_pot_jackpot, jackpot_pre40, is_preventa)
                    VALUES (?, ?, 'pending', 0, 0, ?, ?, false)
                  `, [dbRoom, nextTime, accumulatedPre40, accumulatedPre40]);

                  const newSessionId = sessionResult.insertId;
                  console.log(`[SessionCreator] ✅ Próxima sesión creada: #${newSessionId} para ${dbRoom} (mientras sortea) - Pre-40: $${accumulatedPre40.toFixed(2)}`);

                  // Asignar cartones disponibles a la próxima sesión
                  await this.assignCardsToSession(dbRoom, newSessionId);
                }
              }
            }
            continue; // Sala está sorteando, no hacer más
          }

          // ====== CASO 2: No hay sesión activa - Crear una ======
          if (currentSession.length === 0) {
            const nextTime = await this.calculateNextScheduledTime(room, now);
            
            if (nextTime) {
              // Verificar duplicados
              const [duplicateCheck] = await pool.query(`
                SELECT id FROM game_sessions 
                WHERE room = ? AND start_time = ? 
                  AND status NOT IN ('completed', 'finished', 'cancelled')
                LIMIT 1
              `, [dbRoom, nextTime]);

              if (duplicateCheck.length === 0) {
                // Obtener Pre-40 acumulado para esta sala
                const accumulatedPre40 = await this.getAccumulatedPre40(dbRoom);
                
                const [sessionResult] = await pool.query(`
                  INSERT INTO game_sessions 
                  (room, start_time, status, current_pot_bingo, current_pot_linea, current_pot_jackpot, jackpot_pre40, is_preventa)
                  VALUES (?, ?, 'pending', 0, 0, ?, ?, false)
                `, [dbRoom, nextTime, accumulatedPre40, accumulatedPre40]);

                const newSessionId = sessionResult.insertId;
                console.log(`[SessionCreator] ✅ Sesión creada: #${newSessionId} para ${dbRoom} - Próximo sorteo: ${nextTime.toLocaleString()} - Pre-40: $${accumulatedPre40.toFixed(2)}`);

                // Asignar cartones disponibles a esta sesión
                await this.assignCardsToSession(dbRoom, newSessionId);
              }
            }
          }

        } catch (sessionError) {
          console.error(`[SessionCreator] Error creando sesión para ${room}:`, sessionError.message);
        }
      }
    } catch (error) {
      console.error('[SessionCreator] Error general:', error.message);
    }
  }

  /**
   * Calcula el próximo horario programado para una sala
   */
  async calculateNextScheduledTime(room, now) {
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const [schedules] = await pool.query(`
      SELECT day_of_week, hour
      FROM schedule_settings
      WHERE room = ? AND is_active = 1
      ORDER BY day_of_week, hour
    `, [room]);

    if (schedules.length === 0) {
      return null;
    }

    let nextTime = null;
    let minDiff = Infinity;

    for (const schedule of schedules) {
      const [hour, minute, second] = schedule.hour.split(':').map(Number);
      const scheduleTime = hour * 3600 + minute * 60 + (second || 0);
      
      let dayDiff = schedule.day_of_week - currentDay;
      let timeDiff = scheduleTime - currentTime;

      if (dayDiff === 0 && timeDiff <= 0) {
        dayDiff = 7;
      }
      
      if (dayDiff < 0) {
        dayDiff += 7;
      }

      const totalDiff = dayDiff * 86400 + timeDiff;

      if (totalDiff > 0 && totalDiff < minDiff) {
        minDiff = totalDiff;
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + dayDiff);
        nextDate.setHours(hour, minute, second || 0, 0);
        nextTime = nextDate;
      }
    }

    return nextTime;
  }

  /**
   * Obtiene el pozo Pre-40 acumulado desde room_settings
   * Este valor se acumula hasta que alguien gane BINGO antes de la bolilla 40
   */
  async getAccumulatedPre40(room) {
    try {
      const [settings] = await pool.query(`
        SELECT accumulated_pot_pre40 FROM room_settings WHERE room = ?
      `, [room]);
      
      if (settings.length > 0 && settings[0].accumulated_pot_pre40 > 0) {
        console.log(`[SessionCreator] 💰 Pre-40 acumulado para ${room}: $${parseFloat(settings[0].accumulated_pot_pre40).toFixed(2)}`);
        return parseFloat(settings[0].accumulated_pot_pre40) || 0;
      }
      return 0;
    } catch (error) {
      console.error(`[SessionCreator] Error obteniendo Pre-40 acumulado:`, error.message);
      return 0;
    }
  }

  /**
   * Asigna cartones disponibles a una sesión específica
   * Solo asigna cartones que NO están siendo usados en sorteo actual
   */
  async assignCardsToSession(dbRoom, sessionId) {
    try {
      // 1. Asignar cartones 'available' sin sesión asignada
      const [result] = await pool.query(`
        UPDATE bingo_cards_pool 
        SET game_session_id = ?
        WHERE room = ? 
          AND status = 'available'
          AND (game_session_id IS NULL OR game_session_id = 0)
      `, [sessionId, dbRoom]);

      if (result.affectedRows > 0) {
        console.log(`[SessionCreator] 🎫 ${result.affectedRows} cartones 'available' asignados a sesión #${sessionId} (${dbRoom})`);
      }

      // 2. NUEVO: Migrar cartones 'selected' de sesiones terminadas a esta sesión
      // Esto permite que los usuarios mantengan sus cartones entre sesiones
      const [migratedResult] = await pool.query(`
        UPDATE bingo_cards_pool bp
        INNER JOIN game_sessions gs ON bp.game_session_id = gs.id
        SET bp.game_session_id = ?
        WHERE bp.room = ? 
          AND bp.status = 'selected'
          AND gs.status IN ('finished', 'completed', 'cancelled')
      `, [sessionId, dbRoom]);

      if (migratedResult.affectedRows > 0) {
        console.log(`[SessionCreator] 🔄 ${migratedResult.affectedRows} cartones 'selected' migrados de sesiones anteriores a sesión #${sessionId} (${dbRoom})`);
      }

      return result.affectedRows + migratedResult.affectedRows;
    } catch (error) {
      console.error(`[SessionCreator] Error asignando cartones:`, error.message);
      return 0;
    }
  }

  /**
   * Libera cartones no vendidos de una sesión y los asigna a la siguiente
   * Se llama cuando una sesión cambia a 'closing' (T-5)
   */
  async releaseUnsoldCardsToNextSession(closingSessionId, room) {
    try {
      // Buscar la próxima sesión pendiente para esta sala
      const [nextSession] = await pool.query(`
        SELECT id FROM game_sessions 
        WHERE room = ? 
          AND status = 'pending'
          AND id != ?
        ORDER BY start_time ASC
        LIMIT 1
      `, [room, closingSessionId]);

      if (nextSession.length === 0) {
        console.log(`[SessionCreator] ⚠️ No hay próxima sesión para reasignar cartones de ${room}`);
        return 0;
      }

      const nextSessionId = nextSession[0].id;

      // Reasignar cartones 'available' (no vendidos) a la próxima sesión
      const [result] = await pool.query(`
        UPDATE bingo_cards_pool 
        SET game_session_id = ?
        WHERE room = ? 
          AND game_session_id = ?
          AND status = 'available'
      `, [nextSessionId, room, closingSessionId]);

      if (result.affectedRows > 0) {
        console.log(`[SessionCreator] 🔄 ${result.affectedRows} cartones no vendidos reasignados de sesión #${closingSessionId} a #${nextSessionId}`);
      }

      return result.affectedRows;
    } catch (error) {
      console.error(`[SessionCreator] Error liberando cartones:`, error.message);
      return 0;
    }
  }

  /**
   * Detecta y maneja sesiones huérfanas en estado 'playing' que no están en memoria
   * Esto ocurre después de un reinicio de PM2 cuando hay sorteos en curso
   */
  async handleOrphanedPlayingSessions() {
    try {
      // Buscar sesiones en 'playing' que no están en memoria del gameEngine
      const [playingSessions] = await pool.query(
        `SELECT id, room, start_time FROM game_sessions WHERE status = 'playing'`
      );

      for (const session of playingSessions) {
        const isInMemory = this.gameEngine.activeGames && this.gameEngine.activeGames.has(session.id);
        
        if (!isInMemory) {
          console.log(`[Scheduler] ⚠️ Sesión huérfana detectada: #${session.id} (${session.room}) - en 'playing' pero no en memoria`);
          
          // Cambiar status a 'active' para que el scheduler la retome
          await pool.query(
            `UPDATE game_sessions SET status = 'active' WHERE id = ? AND status = 'playing'`,
            [session.id]
          );
          console.log(`[Scheduler] 🔄 Sesión ${session.id} cambiada de 'playing' a 'active' para reanudar`);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Error manejando sesiones huérfanas:', error.message);
    }
  }

  /**
   * AUTO-DRAW STARTER (Legacy/Recovery)
   * Solo maneja sesiones huérfanas después de un reinicio de PM2.
   * El inicio normal de sorteos lo maneja masterScheduleCheck.
   */
  async checkAndStartPendingSessions() {
    try {
      if (!this.gameEngine) {
        return;
      }

      // Solo manejar sesiones huérfanas (en 'playing' pero no en memoria)
      await this.handleOrphanedPlayingSessions();

      // Manejar sesiones en 'active' que no están corriendo (recovery después de reinicio)
      const [activeSessions] = await pool.query(
        `SELECT id, room FROM game_sessions WHERE status = 'active'`
      );

      for (const session of activeSessions) {
        if (this.gameEngine.activeGames && this.gameEngine.activeGames.has(session.id)) {
          continue; // Ya está corriendo
        }

        // Verificar que no haya otro sorteo activo
        const [anyPlaying] = await pool.query(
          `SELECT id FROM game_sessions WHERE status = 'playing' LIMIT 1`
        );
        
        if (anyPlaying.length > 0) {
          continue; // Hay otro sorteo activo
        }

        console.log(`[AutoDraw Recovery] 🔄 Reanudando sesión huérfana: ${session.room} #${session.id}`);
        await this.gameEngine.startGame(session.id, { autoStart: true });
      }

    } catch (error) {
      console.error('[AutoDraw] Error:', error.message);
    }
  }

  /**
   * Se ejecuta cuando termina una partida (EVENT-DRIVEN, no cron)
   * Genera nuevo stock para la próxima partida
   */
  async handleGameEnd(sessionId, roomType) {
    try {
      console.log(`[Scheduler] Partida finalizada: ${sessionId} (${roomType})`);

      // Calcular próxima fecha de juego
      const nextPlayDate = new Date();
      nextPlayDate.setDate(nextPlayDate.getDate() + 1);

      // Generar 10k cartones para mañana
      const result = await dailyGenerator.generateDailyStock(roomType, nextPlayDate);

      console.log(`[Scheduler] ✅ Stock regenerado: ${result.cardsGenerated} cartones en ${result.timeSeconds}s`);

      return result;
    } catch (error) {
      console.error('[Scheduler] Stock regeneration error:', error);
      throw error;
    }
  }

  /**
   * Health Check - Verificar integridad del sistema
   * Valida que haya stock disponible y reporta anomalías
   */
  async executeHealthCheck() {
    try {
      console.log('[Scheduler HealthCheck] Ejecutando verificación de sistema...');

      const stats = await stockManager.getStockStatus();
      const conversionStats = await dailyGenerator.getStockStats();

      console.log('[Scheduler HealthCheck] Estado actual del stock:');
      for (const stat of stats) {
        console.log(`  ${stat.room}: ${stat.available} disponibles, ${stat.sold} vendidas, ${stat.discarded} descartadas`);

        // Alerta si hay muy poco stock disponible
        if (stat.available < 1000 && stat.available > 0) {
          console.warn(`  ⚠️ ADVERTENCIA: Stock bajo para ${stat.room}`);
        }

        // Alerta si no hay stock
        if (stat.available === 0) {
          console.error(`  ❌ ERROR CRÍTICO: Sin stock para ${stat.room}`);
        }
      }

      console.log('[Scheduler HealthCheck] ✅ Verificación completada');

      return { status: 'ok', stats };
    } catch (error) {
      console.error('[Scheduler HealthCheck] Error:', error);
    }
  }

  /**
   * Limpiar cartones expirados (más de 24h sin vender)
   */
  async executeExpiredStockCleanup() {
    try {
      console.log('[Scheduler Cleanup] Iniciando limpieza de cartones expirados...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Limpiar todos los cartones disponibles de ayer
      const result = await stockManager.cleanUnsoldStock(yesterday);

      console.log(`[Scheduler Cleanup] ✅ Completado: ${result.discardedCount} cartones eliminados`);

      return result;
    } catch (error) {
      console.error('[Scheduler Cleanup] Error:', error);
    }
  }

  /**
   * Parar todos los cron jobs (para graceful shutdown)
   */
  stop() {
    if (!this.isRunning) {
      console.log('[Scheduler] No está corriendo');
      return;
    }

    console.log('[Scheduler] Deteniendo...');

    for (const { name, job } of this.jobs) {
      job.stop();
      console.log(`[Scheduler] ✅ Job detenido: ${name}`);
    }

    this.isRunning = false;
    console.log('[Scheduler] ✅ Todos los jobs detenidos');
  }

  /**
   * Obtener estado actual del scheduler
   */
  getStatus() {
    return {
      running: this.isRunning,
      activeJobs: this.jobs.length,
      jobs: this.jobs.map(j => j.name)
    };
  }

  /**
   * Trigger manual para simular end-game (testing)
   */
  async triggerManualGameEnd(sessionId, roomType) {
    console.log(`[Scheduler] Manual trigger: game end para ${roomType}`);
    return await this.handleGameEnd(sessionId, roomType);
  }
}

/**
 * Helper: Generar grilla aleatoria de bingo 3x9 (90 bolas)
 * Columnas: 1-9, 10-19, ..., 80-90
 */
function generateBingoGrid() {
  const ranges = [
    [1, 9],    // C1
    [10, 19],  // C2
    [20, 29],  // C3
    [30, 39],  // C4
    [40, 49],  // C5
    [50, 59],  // C6
    [60, 69],  // C7
    [70, 79],  // C8
    [80, 90]   // C9
  ];

  const grid = Array(3).fill(null).map(() => Array(9).fill(null));

  // Generar números para cada columna
  const columnNumbers = [];
  for (let col = 0; col < 9; col++) {
    const [min, max] = ranges[col];
    const available = [];
    for (let i = min; i <= max; i++) available.push(i);

    // Shuffle
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    columnNumbers.push(available);
  }

  // Distribuir 15 números (5 por fila)
  for (let row = 0; row < 3; row++) {
    const selectedCols = [];
    const availableCols = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * availableCols.length);
      selectedCols.push(availableCols.splice(idx, 1)[0]);
    }
    selectedCols.sort((a, b) => a - b);

    selectedCols.forEach(col => {
      grid[row][col] = columnNumbers[col].pop();
    });
  }

  return grid;
}

// Crear instancia global
const scheduler = new Scheduler();

// 🔧 NOTA: Los manejadores SIGTERM/SIGINT están en src/index.js
// No se definen aquí para evitar conflictos y cierres prematuros

module.exports = scheduler;
