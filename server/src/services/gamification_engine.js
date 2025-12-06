/**
 * GAMIFICATION ENGINE - "Club 24K"
 * Sistema de fidelización para jugadores con niveles VIP, misiones y premios
 */

const pool = require('../db');

// ========== CONFIGURACIÓN DE NIVELES ==========
const LEVEL_CONFIG = [
  {
    level: 1,
    name: 'Novato',
    xpRequired: 0,
    visualBenefit: 'Avatar Gris',
    creditReward: 0,
    freeCardReward: 0,
    exclusiveAccess: false
  },
  {
    level: 2,
    name: 'Cobre',
    xpRequired: 500,
    visualBenefit: 'Avatar Bronceado',
    creditReward: 0,
    freeCardReward: 1,
    exclusiveAccess: false
  },
  {
    level: 3,
    name: 'Plata Fina',
    xpRequired: 2000,
    visualBenefit: 'Marco Plateado',
    creditReward: 1000,
    freeCardReward: 0,
    exclusiveAccess: false
  },
  {
    level: 4,
    name: 'Oro Puro',
    xpRequired: 10000,
    visualBenefit: 'Marco Dorado Brillante',
    creditReward: 5000,
    freeCardReward: 0,
    exclusiveAccess: false
  },
  {
    level: 5,
    name: 'Diamante 24K',
    xpRequired: 50000,
    visualBenefit: 'Marco Animado + Alias Azul',
    creditReward: 20000,
    freeCardReward: 0,
    exclusiveAccess: true
  }
];

/**
 * Agregar XP al jugador cuando compra un cartón
 * Fórmula: $100 pesos gastados = 1 XP
 * @param {number} userId - ID del jugador
 * @param {number} cardPrice - Precio del cartón comprado
 * @returns {object} - {xpAdded, leveledUp, newLevel, rewards}
 */
async function addXPToPlayer(userId, cardPrice) {
  try {
    // Calcular XP: $100 = 1 XP
    const xpToAdd = Math.floor(cardPrice / 100);
    
    if (xpToAdd === 0) return { xpAdded: 0, leveledUp: false };

    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // Obtener progreso actual del usuario
      let [userProgress] = await connection.query(
        `SELECT * FROM gamification_progress WHERE user_id = ?`,
        [userId]
      );

      let progressData;
      if (userProgress.length === 0) {
        // Primera vez del usuario
        await connection.query(
          `INSERT INTO gamification_progress (user_id, xp_current, current_level, xp_lifetime)
           VALUES (?, ?, 1, ?)`,
          [userId, xpToAdd, xpToAdd]
        );
        progressData = {
          xp_current: xpToAdd,
          current_level: 1,
          xp_lifetime: xpToAdd
        };
      } else {
        progressData = userProgress[0];
        progressData.xp_current += xpToAdd;
        progressData.xp_lifetime += xpToAdd;
      }

      // Verificar si hay level-up
      let leveledUp = false;
      let newLevel = progressData.current_level;
      let rewards = {};

      for (let i = progressData.current_level + 1; i <= LEVEL_CONFIG.length; i++) {
        const levelReq = LEVEL_CONFIG[i - 1];
        if (progressData.xp_lifetime >= levelReq.xpRequired) {
          newLevel = i;
          leveledUp = true;
          
          // Acreditar premios del nivel
          rewards = {
            creditReward: levelReq.creditReward,
            freeCardReward: levelReq.freeCardReward,
            exclusiveAccess: levelReq.exclusiveAccess
          };

          if (levelReq.creditReward > 0) {
            await connection.query(
              `UPDATE users SET balance = balance + ? WHERE id = ?`,
              [levelReq.creditReward, userId]
            );
          }
        }
      }

      // Actualizar progreso
      await connection.query(
        `UPDATE gamification_progress 
         SET xp_current = ?, current_level = ?, xp_lifetime = ?, 
             last_levelup_at = CASE WHEN ? THEN NOW() ELSE last_levelup_at END,
             updated_at = NOW()
         WHERE user_id = ?`,
        [progressData.xp_current, newLevel, progressData.xp_lifetime, leveledUp, userId]
      );

      await connection.query('COMMIT');

      return {
        xpAdded,
        leveledUp,
        newLevel,
        rewards: leveledUp ? rewards : null,
        currentXP: progressData.xp_current,
        nextLevelXP: newLevel < LEVEL_CONFIG.length ? LEVEL_CONFIG[newLevel].xpRequired : null
      };

    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('❌ Error in addXPToPlayer:', err);
    throw err;
  }
}

/**
 * Obtener progreso actual del jugador
 * @param {number} userId - ID del jugador
 * @returns {object} - Progreso, nivel, XP, logros
 */
async function getPlayerProgress(userId) {
  try {
    const [result] = await pool.query(
      `SELECT * FROM gamification_progress WHERE user_id = ?`,
      [userId]
    );

    if (result.length === 0) {
      return {
        level: 1,
        currentXP: 0,
        nextLevelXP: LEVEL_CONFIG[1].xpRequired,
        progressPercent: 0,
        achievements: [],
        rank: 'Novato'
      };
    }

    const progress = result[0];
    const currentLevelConfig = LEVEL_CONFIG[progress.current_level - 1];
    const nextLevelConfig = progress.current_level < LEVEL_CONFIG.length ? LEVEL_CONFIG[progress.current_level] : null;

    const xpForCurrentLevel = currentLevelConfig.xpRequired;
    const xpForNextLevel = nextLevelConfig ? nextLevelConfig.xpRequired : progress.xp_lifetime;
    
    const xpInCurrentLevel = progress.xp_lifetime - xpForCurrentLevel;
    const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
    const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));

    return {
      level: progress.current_level,
      rankName: currentLevelConfig.name,
      currentXP: xpInCurrentLevel,
      nextLevelXP: xpNeededForNextLevel,
      totalXPLifetime: progress.xp_lifetime,
      progressPercent,
      achievements: progress.achievements_unlocked || [],
      visualBenefit: currentLevelConfig.visualBenefit,
      lastLevelup: progress.last_levelup_at
    };

  } catch (err) {
    console.error('❌ Error in getPlayerProgress:', err);
    throw err;
  }
}

/**
 * Obtener todos los niveles disponibles
 * @returns {array} - Configuración de todos los niveles
 */
function getAllLevels() {
  return LEVEL_CONFIG.map(level => ({
    ...level,
    level: level.level,
    name: level.name,
    xpRequired: level.xpRequired,
    visualBenefit: level.visualBenefit,
    creditReward: level.creditReward,
    freeCardReward: level.freeCardReward
  }));
}

/**
 * Obtener requisitos XP para el próximo nivel
 * @param {number} userId - ID del jugador
 * @returns {object} - XP actual y necesario para próximo nivel
 */
async function getNextLevelRequirement(userId) {
  try {
    const [progress] = await pool.query(
      `SELECT current_level, xp_lifetime FROM gamification_progress WHERE user_id = ?`,
      [userId]
    );

    if (progress.length === 0) {
      return {
        currentLevel: 1,
        currentXP: 0,
        nextLevelName: LEVEL_CONFIG[1].name,
        xpRequired: LEVEL_CONFIG[1].xpRequired,
        xpRemaining: LEVEL_CONFIG[1].xpRequired
      };
    }

    const data = progress[0];
    if (data.current_level >= LEVEL_CONFIG.length) {
      return {
        currentLevel: data.current_level,
        currentXP: data.xp_lifetime,
        nextLevelName: 'Máximo',
        xpRequired: data.xp_lifetime,
        xpRemaining: 0
      };
    }

    const nextLevel = LEVEL_CONFIG[data.current_level];
    return {
      currentLevel: data.current_level,
      currentXP: data.xp_lifetime,
      nextLevelName: nextLevel.name,
      xpRequired: nextLevel.xpRequired,
      xpRemaining: Math.max(0, nextLevel.xpRequired - data.xp_lifetime)
    };

  } catch (err) {
    console.error('❌ Error in getNextLevelRequirement:', err);
    throw err;
  }
}

/**
 * Obtener top jugadores por nivel
 * @param {number} limit - Cantidad de jugadores (default 10)
 * @returns {array} - Top players con nivel y XP
 */
async function getTopPlayers(limit = 10) {
  try {
    const [result] = await pool.query(
      `SELECT u.id, u.username, up.current_level, up.xp_lifetime
       FROM gamification_progress up
       JOIN users u ON u.id = up.user_id
       WHERE u.role = 'jugador'
       ORDER BY up.xp_lifetime DESC
       LIMIT ?`,
      [limit]
    );

    return result.map(row => ({
      userId: row.id,
      username: row.username,
      level: row.current_level,
      totalXP: row.xp_lifetime,
      rankName: LEVEL_CONFIG[row.current_level - 1]?.name || 'Novato'
    }));

  } catch (err) {
    console.error('❌ Error in getTopPlayers:', err);
    throw err;
  }
}

/**
 * Inicializar progreso para nuevo usuario
 * @param {number} userId - ID del jugador
 */
async function initializePlayerProgress(userId) {
  try {
    await pool.query(
      `INSERT INTO gamification_progress (user_id, xp_current, current_level, xp_lifetime)
       VALUES (?, 0, 1, 0)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [userId]
    );
  } catch (err) {
    console.error('❌ Error in initializePlayerProgress:', err);
    throw err;
  }
}

module.exports = {
  addXPToPlayer,
  getPlayerProgress,
  getAllLevels,
  getNextLevelRequirement,
  getTopPlayers,
  initializePlayerProgress
};
