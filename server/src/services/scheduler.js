const cron = require('node-cron');
const pool = require('../db');
const stockManager = require('./stockManager');
const dailyGenerator = require('./dailyGenerator');
const questManager = require('./quest_manager');
const rankingEngine = require('./ranking_engine');
const membershipService = require('./membershipService');

/**
 * SCHEDULER - Orquestación de Cron Jobs
 * 
 * Jobs:
 * 1. T-5 Closure (5 min antes de partida) - Bloquear ventas + limpiar cartones viejos
 * 2. End-Game Regeneration - Generar stock para día siguiente al terminar partida
 * 3. Health Check - Verificar integridad del sistema cada 6 horas
 * 4. Weekly Ranking Reset - Lunes 00:00 calcular ranking y acreditar bonos
 * 5. Daily Quests Refresh - 00:01 crear nuevas misiones para todos
 * 6. Graceful Shutdown - Parar crons limpios
 */

class Scheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
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

    // JOB 1: T-5 Closure - Bloquear ventas (cada minuto, verificar si corresponde)
    const t5Job = cron.schedule('* * * * *', async () => {
      try {
        await this.checkAndExecuteT5Closure();
      } catch (error) {
        console.error('[Scheduler] T-5 Closure error:', error.message);
      }
    });
    this.jobs.push({ name: 'T-5 Closure', job: t5Job });
    console.log('[Scheduler] Job registrado: T-5 Closure Monitor');

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
         WHERE room = 'free_starter' AND DATE(start_time) = ?`,
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
           VALUES ('free_starter', ?, 'pending', 0.00, 0.00, 0.00, false)`,
          [startTime]
        );

        const sessionId = sessionResult.insertId;

        // 2. Generar 20 cartones gratuitos
        const gridNumbers = generateBingoGrid();
        for (let i = 1; i <= 20; i++) {
          await connection.query(
            `INSERT INTO daily_stock_cards 
             (room, serial_number, grid_numbers, play_date, play_time, status, price)
             VALUES ('free_starter', ?, ?, ?, '19:00:00', 'available', 0.00)`,
            [i, JSON.stringify(gridNumbers), today]
          );
        }

        await connection.query('COMMIT');
        console.log(`✅ Sala Starter creada: Sesión #${sessionId} con 20 cartones gratuitos`);

      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[Scheduler] createStarterSession error:', error);
    }
  }

  /**
   * Verifica y ejecuta closure T-5 si corresponde
   * Bloquea ventas y limpia cartones viejos 5 minutos antes de que termine la partida
   */
  async checkAndExecuteT5Closure() {
    try {
      const now = new Date();

      // Obtener todas las sesiones próximas a cerrarse
      const [sessionsResult] = await pool.query(
        `SELECT id, room, start_time FROM game_sessions 
         WHERE status IN ('pending', 'active')
         AND start_time IS NOT NULL`
      );

      for (const session of sessionsResult) {
        const startTime = new Date(session.start_time);
        const minutesUntilStart = (startTime - now) / (1000 * 60);

        // Si faltan exactamente 5 minutos (con margen de 1 minuto para cron)
        if (minutesUntilStart > 4 && minutesUntilStart <= 5) {
          console.log(`[Scheduler T-5] Cerrando ventas para ${session.room} (faltan ${minutesUntilStart.toFixed(1)} min)`);

          // 1. Bloquear ventas
          await stockManager.blockSales(new Date(session.start_time), session.room);

          // 2. Limpiar cartones viejos (más de 24h)
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          await stockManager.cleanUnsoldStock(yesterday, session.room);

          console.log(`[Scheduler T-5] ✅ Closure completado para ${session.room}`);
        }
      }
    } catch (error) {
      console.error('[Scheduler T-5] Error en closure:', error);
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
