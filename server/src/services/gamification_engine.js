const pool = require('../db');
const notificationService = require('./notificationService'); // Importar NotificationService

const ACCOUNT_LEVEL_CONFIG = [
  { level: 1, xp: 0, freeReward: 'None', premiumReward: 'Avatar Frame' },
  { level: 2, xp: 100, freeReward: '50 Credits', premiumReward: 'Golden Chip' },
  { level: 3, xp: 300, freeReward: 'Ticket', premiumReward: 'Rare Emote' },
  { level: 4, xp: 600, freeReward: '100 Credits', premiumReward: 'Double XP 1h' },
  { level: 5, xp: 1000, freeReward: 'Ticket', premiumReward: 'Legendary Border' },
  { level: 6, xp: 1500, freeReward: '150 Credits', premiumReward: 'VIP Access 24h' },
  { level: 7, xp: 2100, freeReward: 'Ticket', premiumReward: 'Exclusive Badge' },
  { level: 8, xp: 2800, freeReward: '200 Credits', premiumReward: 'Golden Name Color' },
  { level: 9, xp: 3600, freeReward: 'Ticket', premiumReward: 'Mystery Box' },
  { level: 10, xp: 4500, freeReward: '500 Credits', premiumReward: 'Permanent Avatar' },
  { level: 11, xp: 5500, freeReward: 'Ticket', premiumReward: 'Season Skin' },
  { level: 12, xp: 6600, freeReward: '300 Credits', premiumReward: '1000 Credits' },
  { level: 13, xp: 7800, freeReward: 'Ticket', premiumReward: 'Effect: Sparkles' },
  { level: 14, xp: 9100, freeReward: '400 Credits', premiumReward: 'Title: Elite' },
  { level: 15, xp: 10500, freeReward: 'Ticket', premiumReward: 'Effect: Fire' },
  { level: 16, xp: 12000, freeReward: '500 Credits', premiumReward: 'Badge: Conqueror' },
  { level: 17, xp: 13600, freeReward: 'Ticket', premiumReward: 'Pet: Golden Dragon' },
  { level: 18, xp: 15300, freeReward: '600 Credits', premiumReward: 'Lobby Theme' },
  { level: 19, xp: 17100, freeReward: 'Ticket', premiumReward: 'Private Room Key' },
  { level: 20, xp: 19000, freeReward: '1000 Credits', premiumReward: 'Title: Legend' }
];

async function addXPToPlayer(userId, amount) {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('UPDATE users SET current_xp = current_xp + ? WHERE id = ?', [amount, userId]);

      const [rows] = await connection.query('SELECT username, current_xp, level FROM users WHERE id = ?', [userId]);
      if (rows.length > 0) {
        const { username, current_xp, level: currentLevel } = rows[0];

        let newLevel = currentLevel;
        for (const cfg of ACCOUNT_LEVEL_CONFIG) {
          if (current_xp >= cfg.xp) newLevel = cfg.level;
        }

        if (newLevel > currentLevel) {
          await connection.query('UPDATE users SET level = ? WHERE id = ?', [newLevel, userId]);

          // NOTIFICAR LEVEL UP
          notificationService.broadcastLevelUp(username, newLevel, `Nivel ${newLevel}`);

          return { leveledUp: true, newLevel, rewards: [] };
        }
      }
      return { leveledUp: false };
    } finally {
      connection.release();
    }
  } catch (e) {
    console.error('Add XP Error', e);
    return { leveledUp: false };
  }
}

// ...

async function triggerAchievement(userId, code, increment = 1) {
  try {
    const connection = await pool.getConnection();
    try {
      // 1. Obtener ID del logro y target
      const [achDefs] = await connection.query(
        `SELECT id, name, target_value FROM achievements WHERE code = ?`,
        [code]
      );

      if (achDefs.length === 0) return false;
      const achievement = achDefs[0];

      // ... (existing logic) ...
      const [userAch] = await connection.query(
        `SELECT id, current_value, is_completed FROM user_achievements 
         WHERE user_id = ? AND achievement_id = ?`,
        [userId, achievement.id]
      );

      let currentValue = 0;
      let alreadyCompleted = false;

      if (userAch.length === 0) {
        await connection.query(
          `INSERT INTO user_achievements (user_id, achievement_id, current_value) VALUES (?, ?, ?)`,
          [userId, achievement.id, increment]
        );
        currentValue = increment;
      } else {
        alreadyCompleted = userAch[0].is_completed === 1;
        currentValue = userAch[0].current_value + increment;
        await connection.query(
          `UPDATE user_achievements SET current_value = ? WHERE id = ?`,
          [currentValue, userAch[0].id]
        );
      }

      // 3. Verificar Completitud
      if (!alreadyCompleted && currentValue >= achievement.target_value) {
        await connection.query(
          `UPDATE user_achievements SET is_completed = TRUE, completed_at = NOW() WHERE user_id = ? AND achievement_id = ?`,
          [userId, achievement.id]
        );

        // Obtener username para notificar
        const [u] = await connection.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (u.length > 0) {
          notificationService.broadcastAchievement(u[0].username, achievement.name, '🏆');
        }

        console.log(`🏆 Achievement Unlocked: ${code} for User ${userId}`);
        return { unlocked: true, code };
      }

      return { unlocked: false, progress: currentValue, target: achievement.target_value };

    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Trigger Achievement Error:', err);
    return false;
  }
}

async function getPlayerProgress(userId) {
  try {
    const connection = await pool.getConnection();
    try {
      // Obtener datos básicos
      const [userRows] = await connection.query(`SELECT level, current_xp FROM users WHERE id = ?`, [userId]);
      if (userRows.length === 0) return { level: 1, currentXp: 0 };

      const { level, current_xp } = userRows[0];

      // Obtener racha
      const [streakRows] = await connection.query(`SELECT current_streak FROM user_streaks WHERE user_id = ?`, [userId]);
      const currentStreak = streakRows.length > 0 ? streakRows[0].current_streak : 0;

      // Obtener logros completados
      const [achRows] = await connection.query(`SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ? AND is_completed = TRUE`, [userId]);
      const achievementsCount = achRows[0].count;

      return {
        userId,
        level,
        currentXp: current_xp,
        currentStreak,
        achievementsCount
      };
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('getPlayerProgress Error', err);
    return { level: 1, currentXp: 0 };
  }
}

async function getTopPlayers() {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT id, username, level, current_xp 
        FROM users 
        WHERE role = 'user' 
        ORDER BY level DESC, current_xp DESC 
        LIMIT 5
      `);

      return rows.map((r, index) => ({
        rank: index + 1,
        username: r.username,
        level: r.level,
        xp: r.current_xp
      }));
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('getTopPlayers Error', err);
    return [];
  }
}

// Girar la Ruleta de la Suerte (Cooldown 4 horas)
async function spinFortuneWheel(userId) {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // 1. Verify Cooldown
      const [userRows] = await connection.query(
        `SELECT last_wheel_spin FROM users WHERE id = ?`,
        [userId]
      );

      if (userRows.length === 0) throw new Error('User not found');

      const lastSpin = userRows[0].last_wheel_spin;
      const now = new Date();

      if (lastSpin) {
        const diffMs = now - new Date(lastSpin);
        const hoursSinceLastSpin = diffMs / (1000 * 60 * 60);

        if (hoursSinceLastSpin < 24) {
          const remainingMinutes = Math.ceil((24 - hoursSinceLastSpin) * 60);
          throw new Error(`Cooldown activo. Intenta de nuevo en ${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m.`);
        }
      }

      // 2. Determine Prize (Weighted Random)
      // Ajustados para premios más pequeños y frecuentes que el premio semanal
      // 2. Determine Prize (Weighted Random)
      // New Config: ONLY Tickets (Bronze/Silver/Gold) + Impossible Big Cash
      // 12 Segments total

      const prizes = [
        // BIG CASH (Weight 0 - Impossible) - Placed at 0, 4, 8 indices
        { index: 0, type: 'credits', amount: 100000, label: '$100.000', weight: 0, color: '#e74c3c' }, // Red
        { index: 4, type: 'credits', amount: 50000, label: '$50.000', weight: 0, color: '#e67e22' },  // Orange
        { index: 8, type: 'credits', amount: 5000, label: '$5.000', weight: 0, color: '#f1c40f' },   // Gold/Yellow

        // TICKETS (Weights > 0)
        // Filling the gaps: 1, 2, 3, 5, 6, 7, 9, 10, 11
        // Bronze: Common (High weight)
        { index: 1, type: 'ticket', room: 'bronce', label: '🎫 BRONCE', weight: 100, color: '#cd7f32' },
        { index: 2, type: 'ticket', room: 'bronce', label: '🎫 BRONCE', weight: 100, color: '#cd7f32' },
        { index: 3, type: 'ticket', room: 'bronce', label: '🎫 BRONCE', weight: 100, color: '#cd7f32' },

        // Silver: Uncommon (Medium weight)
        { index: 5, type: 'ticket', room: 'plata', label: '🎫 PLATA', weight: 50, color: '#bdc3c7' },
        { index: 6, type: 'ticket', room: 'plata', label: '🎫 PLATA', weight: 50, color: '#bdc3c7' },
        { index: 7, type: 'ticket', room: 'plata', label: '🎫 PLATA', weight: 50, color: '#bdc3c7' },

        // Gold: Rare (Low weight)
        { index: 9, type: 'ticket', room: 'oro', label: '🎫 ORO', weight: 10, color: '#f1c40f' },
        { index: 10, type: 'ticket', room: 'oro', label: '🎫 ORO', weight: 10, color: '#f1c40f' },
        { index: 11, type: 'ticket', room: 'bronce', label: '🎫 BRONCE', weight: 100, color: '#cd7f32' } // Extra bronze to fill
      ];

      const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedPrize = prizes.find(p => p.weight > 0);

      for (const p of prizes) {
        if (p.weight === 0) continue;
        if (random < p.weight) {
          selectedPrize = p;
          break;
        }
        random -= p.weight;
      }

      // 3. Entregar Premio
      if (selectedPrize.type === 'credits') {
        await connection.query(`UPDATE users SET balance = balance + ? WHERE id = ?`, [selectedPrize.amount, userId]);
      } else if (selectedPrize.type === 'ticket') {
        const ticketRoom = selectedPrize.room || 'bronce'; // Use dynamic room

        // Acreditar 1 cartón como REGALO (is_gift = 1) para que no afecte pozos
        // Primero verificar si ya existe un registro de regalos para esta sala
        const [existing] = await connection.query(`
          SELECT id, quantity FROM user_card_inventory 
          WHERE user_id = ? AND room = ? AND is_gift = 1
        `, [userId, ticketRoom]);

        if (existing.length > 0) {
          // Actualizar cantidad existente
          await connection.query(`
            UPDATE user_card_inventory 
            SET quantity = quantity + 1, updated_at = NOW()
            WHERE id = ?
          `, [existing[0].id]);
        } else {
          // Crear nuevo registro de regalo
          await connection.query(`
            INSERT INTO user_card_inventory (user_id, room, quantity, is_gift, created_at)
            VALUES (?, ?, 1, 1, NOW())
          `, [userId, ticketRoom]);
        }

        console.log(`🎁 [FortuneWheel] Usuario ${userId} ganó 1 cartón REGALO de ${ticketRoom}`);
      }

      // 4. Update last_wheel_spin
      await connection.query(
        `UPDATE users SET last_wheel_spin = NOW() WHERE id = ?`,
        [userId]
      );

      // Log for audit
      await connection.query(
        `INSERT INTO game_events (user_id, event_type, details) VALUES (?, 'fortune_wheel_spin', ?)`,
        [userId, JSON.stringify(selectedPrize)]
      );

      // 5. Obtener cartones actualizados ANTES del commit (separados por tipo)
      const [inventory] = await connection.query(`
        SELECT 
          room,
          SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END) as normal,
          SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) as gift,
          SUM(quantity) as total
        FROM user_card_inventory
        WHERE user_id = ?
        GROUP BY room
      `, [userId]);

      const cartonesNormales = { bronce: 0, plata: 0, oro: 0 };
      const cartonesRegalo = { bronce: 0, plata: 0, oro: 0 };
      const cartonesTotales = { bronce: 0, plata: 0, oro: 0 };

      inventory.forEach(row => {
        cartonesNormales[row.room] = parseInt(row.normal) || 0;
        cartonesRegalo[row.room] = parseInt(row.gift) || 0;
        cartonesTotales[row.room] = parseInt(row.total) || 0;
      });

      await connection.commit();

      // 6. Emitir evento Socket.IO para actualizar recursos en tiempo real
      if (global.io) {
        const eventData = {
          userId, // Agregar userId para que el admin sepa qué usuario actualizar
          cartones: cartonesTotales, // Total para el jugador
          cards_bronce: cartonesNormales.bronce, // Separados para el admin
          cards_plata: cartonesNormales.plata,
          cards_oro: cartonesNormales.oro,
          gift_bronce: cartonesRegalo.bronce,
          gift_plata: cartonesRegalo.plata,
          gift_oro: cartonesRegalo.oro,
          message: `¡Ganaste 1 cartón de ${selectedPrize.room.toUpperCase()}! 🎁`
        };

        // Emitir al jugador específico
        global.io.to(`user_${userId}`).emit('resources_updated', eventData);

        // También emitir a todos los clientes (para que los admins lo reciban)
        global.io.emit('resources_updated', eventData);

        console.log(`📡 [FortuneWheel] Evento resources_updated emitido para user_${userId}:`, eventData);
      } else {
        console.warn(`⚠️ [FortuneWheel] global.io no disponible, no se pudo emitir evento`);
      }

      return selectedPrize;

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Spin Fortune Wheel Error:', err);
    throw err;
  }
}

// Girar la Ruleta Semanal (Premio Racha 7 días)
async function spinDailyWheel(userId) {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // 1. Verify Streak Requirement
      const [streakRows] = await connection.query(
        `SELECT * FROM user_streaks WHERE user_id = ?`,
        [userId]
      );

      if (streakRows.length === 0 || streakRows[0].current_streak < 7) {
        throw new Error('Not eligible for spin (Streak < 7)');
      }

      // Check if already claimed today
      const today = new Date().toISOString().split('T')[0];
      if (streakRows[0].last_claim_date === today) {
        throw new Error('Already claimed today');
      }

      // 2. Determinar Premio (Weighted Random)
      const prizes = [
        { type: 'credits', amount: 500, weight: 50 },  // 50%
        { type: 'credits', amount: 1000, weight: 30 }, // 30%
        { type: 'credits', amount: 5000, weight: 15 }, // 15%
        { type: 'ticket', quantity: 1, name: 'Ticket Oro', weight: 4 }, // 4%
        { type: 'credits', amount: 50000, weight: 1 }   // 1% (Grand Prize)
      ];

      const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedPrize = prizes[0];

      for (const p of prizes) {
        if (random < p.weight) {
          selectedPrize = p;
          break;
        }
        random -= p.weight;
      }

      // 3. Entregar Premio
      if (selectedPrize.type === 'credits') {
        await connection.query(`UPDATE users SET balance = balance + ? WHERE id = ?`, [selectedPrize.amount, userId]);
      } else if (selectedPrize.type === 'ticket') {
        // Add to inventory (simplified)
        // In real implementation call shop logic or insert to user_inventory
      }

      // 4. Marcar como reclamado (y resetear racha si el diseño lo pide, o dejarla en 7?)
      // Design V2: Reset loop
      await connection.query(
        `UPDATE user_streaks SET current_streak = 1, last_claim_date = ? WHERE user_id = ?`,
        [today, userId]
      );

      await connection.commit();
      return selectedPrize;

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Spin Wheel Error:', err);
    throw err;
  }
}

// Check Daily Streak
async function checkDailyStreak(userId) {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM user_streaks WHERE user_id = ?', [userId]);
      if (rows.length === 0) return { currentStreak: 0, lastClaimDate: null };
      return {
        currentStreak: rows[0].current_streak,
        lastClaimDate: rows[0].last_claim_date
      };
    } finally {
      connection.release();
    }
  } catch (e) {
    console.error('Streak Check Error', e);
    return null;
  }
}

module.exports = {
  addXPToPlayer,
  checkDailyStreak,
  triggerAchievement,
  getPlayerProgress,
  getTopPlayers,
  getAllLevels: () => ACCOUNT_LEVEL_CONFIG,
  spinDailyWheel, // Racha 7 dias
  spinFortuneWheel // Rueda cada 4 horas
};
