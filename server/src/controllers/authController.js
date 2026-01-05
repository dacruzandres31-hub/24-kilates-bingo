const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const referralHelper = require('../helpers/referralHelper');

const SECRET = process.env.JWT_SECRET || 'tu_super_secret_key_24k';

// Generar JWT
const generateToken = (userId, role, username) => {
  const token = jwt.sign({ id: userId, role, username }, SECRET, { expiresIn: '30d' });
  console.log('🔑 [TOKEN-GEN] Generated token payload:', { id: userId, role, username });
  return token;
};

// LOGIN - Validar credenciales y retornar token
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password requeridos' });
    }

    // Buscar usuario
    const [userResult] = await pool.query(
      'SELECT id, username, role, password_hash, balance, is_blocked, block_reason FROM users WHERE username = ?',
      [username]
    );

    if (userResult.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    const user = userResult[0];

    // Verificar si el usuario está bloqueado
    if (user.is_blocked) {
      return res.status(403).json({ 
        error: 'Usuario bloqueado',
        blocked: true,
        reason: user.block_reason,
        role: user.role
      });
    }

    // Comparar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    // Generar token
    const token = generateToken(user.id, user.role, user.username);

    // Obtener datos de gamificación (streak, nivel, etc.)
    let gamification = { streak: null };
    try {
      const [streakResult] = await pool.query(
        `SELECT current_streak, longest_streak, last_login_date, 
                DATEDIFF(CURRENT_DATE, last_login_date) as days_since_login
         FROM users WHERE id = ?`,
        [user.id]
      );
      if (streakResult.length > 0) {
        gamification.streak = streakResult[0];
      }
      // Actualizar last_login_date
      await pool.query('UPDATE users SET last_login_date = CURRENT_DATE WHERE id = ?', [user.id]);
    } catch (gamErr) {
      console.error('Error obteniendo gamification:', gamErr);
    }

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          balance: user.balance
        },
        gamification
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Error en login' });
  }
};

// REGISTER - Crear nuevo usuario
exports.register = async (req, res) => {
  try {
    const { username, password, role = 'jugador', parent_id, referral_code } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password requeridos' });
    }

    // Validar rol
    const validRoles = ['superadmin', 'agente', 'jugador'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Verificar duplicado
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Usuario ya existe' });
    }

    // Determinar parent_id: usar el proporcionado o buscar por código de referido
    let finalParentId = parent_id || null;
    if (!finalParentId && referral_code) {
      const referrer = await referralHelper.findUserByReferralCode(referral_code);
      if (referrer) {
        finalParentId = referrer.id;
        console.log(`✓ Referido encontrado: ${referrer.username} (ID: ${referrer.id})`);
      }
    }

    // Generar código de referido único para el nuevo usuario
    const newReferralCode = await referralHelper.generateUniqueCode();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario con referral_code
    const [result] = await pool.query(
      `INSERT INTO users (username, password, role, parent_id, balance, referral_code)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, role, finalParentId, 0.00, newReferralCode]
    );

    // Obtener el usuario recién creado
    const [newUserResult] = await pool.query(
      'SELECT id, username, role, balance FROM users WHERE id = ?',
      [result.insertId]
    );
    const newUser = newUserResult[0];

    // Auto-inicializar gamificación para jugadores
    if (role === 'jugador') {
      try {
        // Crear progreso
        await pool.query(`
          INSERT INTO gamification_progress (user_id, current_level, xp_current, xp_lifetime)
          VALUES (?, 1, 0, 0)
        `, [newUser.id]);

        // Crear quests iniciales
        await pool.query(`
          INSERT INTO daily_quests (user_id, quest_name, quest_type, target_value, xp_reward)
          VALUES 
            (?, 'Primera victoria', 'WIN', 1, 100),
            (?, 'Jugar 3 partidas', 'PLAY', 3, 50),
            (?, 'Completar un cartón', 'COMPLETE_CARD', 1, 75)
        `, [newUser.id, newUser.id, newUser.id]);

        console.log(`✓ Gamificación inicializada para ${newUser.username}`);
      } catch (gamErr) {
        console.error('⚠️ Error inicializando gamificación:', gamErr.message);
        // No bloquear el registro si falla gamificación
      }

      // 🔔 Notificar al agente padre si existe
      if (parent_id) {
        try {
          const whatsapp24KService = require('../services/whatsapp24KService');
          // Contar jugadores totales del agente
          const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM users WHERE parent_id = ?',
            [parent_id]
          );
          
          whatsapp24KService.notifyNewPlayerRegistered(parent_id, {
            playerName: newUser.username,
            totalPlayers: countResult[0]?.total || 1
          }).catch(err => console.error('[WhatsApp] Error notificando nuevo jugador:', err));
        } catch (waErr) {
          console.error('⚠️ Error notificando WhatsApp nuevo jugador:', waErr.message);
        }
      }
    }

    const token = generateToken(newUser.id, newUser.role, newUser.username);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        balance: newUser.balance
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error en registro' });
  }
};

// REFRESH TOKEN - Renovar token expirado
exports.refreshToken = async (req, res) => {
  try {
    const { id, role, username } = req.user; // Del middleware authMiddleware

    // Si no tenemos username en el token, buscarlo en BD
    let finalUsername = username;
    if (!finalUsername) {
      const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [id]);
      finalUsername = users[0]?.username;
    }

    const newToken = generateToken(id, role, finalUsername);

    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Error renovando token' });
  }
};

// LOGOUT - Invalidar token (opcional, depende de tu arquitectura)
exports.logout = async (req, res) => {
  // En un setup con blacklist o Redis, aquí se invalidaría el token
  res.json({ message: 'Logout exitoso' });
};

// VERIFY TOKEN - Verificar si el token es válido
exports.verifyToken = async (req, res) => {
  try {
    const { userId, role } = req.user;
    res.json({
      valid: true,
      user: { userId, role }
    });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Token inválido' });
  }
};

// CHANGE PASSWORD - Cambiar contraseña del usuario autenticado
exports.changePassword = async (req, res) => {
  try {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva requeridas' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Obtener contraseña actual del usuario
    const [userResult] = await pool.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult[0];

    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña en la base de datos
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [newPasswordHash, userId]
    );

    res.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente' 
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

