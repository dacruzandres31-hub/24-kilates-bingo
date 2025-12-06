/**
 * NOTIFICATION SERVICE - "Muro de la Fama"
 * Emisor global de eventos para Socket.IO (Global Ticker)
 */

let globalIO = null;

/**
 * Inicializar el servicio con la instancia de Socket.IO
 * @param {object} ioInstance - Instancia de socket.io desde index.js
 */
function initialize(ioInstance) {
  globalIO = ioInstance;
  console.log('[NotificationService] Inicializado ✅');
}

/**
 * Tipos de anuncios disponibles
 */
const ANNOUNCEMENT_TYPES = {
  LEVEL_UP: 'levelup',
  BIG_WIN: 'bigwin',
  AGENT_RANK: 'agent_rank',
  WELCOME: 'welcome',
  ACHIEVEMENT: 'achievement',
  LINEA: 'linea'
};

/**
 * Broadcast de logro de jugador (Level UP)
 * @param {string} username - Nombre del usuario
 * @param {number} newLevel - Nuevo nivel
 * @param {string} rankName - Nombre del rango
 */
async function broadcastLevelUp(username, newLevel, rankName) {
  if (!globalIO) {
    console.error('❌ NotificationService no inicializado');
    return;
  }

  const message = `¡Bravo! ${username} acaba de alcanzar nivel ${rankName} 🏆`;
  
  const announcement = {
    id: Date.now(),
    text: message,
    type: ANNOUNCEMENT_TYPES.LEVEL_UP,
    icon: '🏆',
    color: 'text-amber-400',
    username,
    priority: 'high',
    timestamp: new Date()
  };

  console.log(`[GlobalTicker] Level UP: ${message}`);
  globalIO.emit('global_ticker_message', announcement);
}

/**
 * Broadcast de gran victoria (Premio importante)
 * @param {string} username - Nombre del jugador
 * @param {number} prizeAmount - Monto ganado
 * @param {string} room - Sala (bronce, plata, oro)
 * @param {string} prizeType - Tipo: 'linea', 'bingo', 'jackpot'
 */
async function broadcastBigWin(username, prizeAmount, room, prizeType = 'bingo') {
  if (!globalIO) return;

  const roomNames = {
    bronce: 'Sala Bronce',
    plata: 'Sala Plata',
    oro: 'Sala Oro'
  };

  const prizeFormatted = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(prizeAmount);

  const message = `¡Impactante! ${username} ganó ${prizeFormatted} en la ${roomNames[room] || room} (${prizeType.toUpperCase()}) 💰`;

  const announcement = {
    id: Date.now(),
    text: message,
    type: ANNOUNCEMENT_TYPES.BIG_WIN,
    icon: '💰',
    color: 'text-green-400',
    username,
    prizeAmount,
    priority: prizeAmount > 50000 ? 'critical' : 'high',
    timestamp: new Date()
  };

  console.log(`[GlobalTicker] Big Win: ${message}`);
  globalIO.emit('global_ticker_message', announcement);
}

/**
 * Broadcast de logro de agente (Ranking)
 * @param {string} username - Nombre del agente
 * @param {number} position - Posición en ranking (1, 2, 3)
 * @param {number} salesAmount - Monto de ventas
 */
async function broadcastAgentRank(username, position, salesAmount) {
  if (!globalIO) return;

  const badges = ['🥇', '🥈', '🥉'];
  const badge = badges[position - 1] || '⭐';

  const message = `${badge} El Agente ${username} está en el TOP ${position} de Vendedores de la semana 🔥`;

  const announcement = {
    id: Date.now(),
    text: message,
    type: ANNOUNCEMENT_TYPES.AGENT_RANK,
    icon: '🔥',
    color: 'text-blue-400',
    username,
    position,
    priority: position === 1 ? 'critical' : 'high',
    timestamp: new Date()
  };

  console.log(`[GlobalTicker] Agent Rank: ${message}`);
  globalIO.emit('global_ticker_message', announcement);
}

/**
 * Broadcast de bienvenida (Nuevo agente o jugador)
 * @param {string} username - Nombre del nuevo usuario
 * @param {string} role - Rol: 'agente' o 'jugador'
 */
async function broadcastWelcome(username, role = 'jugador') {
  if (!globalIO) return;

  const roleText = role === 'agente' ? 'Agente' : 'Jugador';
  const message = `Demos la bienvenida al nuevo ${roleText} ${username} a la familia 24K 👋`;

  const announcement = {
    id: Date.now(),
    text: message,
    type: ANNOUNCEMENT_TYPES.WELCOME,
    icon: '👋',
    color: 'text-cyan-400',
    username,
    role,
    priority: 'medium',
    timestamp: new Date()
  };

  console.log(`[GlobalTicker] Welcome: ${message}`);
  globalIO.emit('global_ticker_message', announcement);
}

/**
 * Broadcast de logro de agente (Medallas)
 * @param {string} username - Nombre del agente
 * @param {string} achievementName - Nombre del logro
 * @param {string} achievementIcon - Icono
 */
async function broadcastAchievement(username, achievementName, achievementIcon = '🏅') {
  if (!globalIO) return;

  const message = `${achievementIcon} El Agente ${username} desbloqueó: ${achievementName}`;

  const announcement = {
    id: Date.now(),
    text: message,
    type: ANNOUNCEMENT_TYPES.ACHIEVEMENT,
    icon: achievementIcon,
    color: 'text-purple-400',
    username,
    achievementName,
    priority: 'medium',
    timestamp: new Date()
  };

  console.log(`[GlobalTicker] Achievement: ${message}`);
  globalIO.emit('global_ticker_message', announcement);
}

/**
 * Broadcast de Línea (Menos importante que Bingo pero aún celebrable)
 * @param {string} username - Nombre del jugador
 * @param {string} room - Sala
 */
async function broadcastLinea(username, room) {
  if (!globalIO) return;

  const roomNames = {
    bronce: 'Bronce',
    plata: 'Plata',
    oro: 'Oro'
  };

  const message = `🎯 ${username} hizo LÍNEA en la Sala ${roomNames[room] || room}`;

  const announcement = {
    id: Date.now(),
    text: message,
    type: ANNOUNCEMENT_TYPES.LINEA,
    icon: '🎯',
    color: 'text-yellow-400',
    username,
    priority: 'low',
    timestamp: new Date()
  };

  console.log(`[GlobalTicker] Línea: ${message}`);
  globalIO.emit('global_ticker_message', announcement);
}

/**
 * Broadcast personalizado (Para eventos especiales)
 * @param {string} message - Mensaje personalizado
 * @param {string} icon - Icono
 * @param {string} color - Color (Tailwind class)
 * @param {string} priority - 'critical', 'high', 'medium', 'low'
 */
async function broadcastCustom(message, icon = '✨', color = 'text-white', priority = 'medium') {
  if (!globalIO) return;

  const announcement = {
    id: Date.now(),
    text: message,
    type: 'custom',
    icon: icon,
    color: color,
    priority: priority,
    timestamp: new Date()
  };

  console.log(`[GlobalTicker] Custom: ${message}`);
  globalIO.emit('global_ticker_message', announcement);
}

/**
 * Obtener resumen de últimos anuncios (para persistencia en backend)
 * @returns {array} - Array de últimos anuncios
 */
function getRecentAnnouncements(limit = 10) {
  // En producción, esto traería de Redis o DB
  return [];
}

module.exports = {
  initialize,
  broadcastLevelUp,
  broadcastBigWin,
  broadcastAgentRank,
  broadcastWelcome,
  broadcastAchievement,
  broadcastLinea,
  broadcastCustom,
  getRecentAnnouncements,
  ANNOUNCEMENT_TYPES
};
