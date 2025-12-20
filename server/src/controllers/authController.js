const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const SECRET = process.env.JWT_SECRET || 'tu_super_secret_key_24k';

// Generar JWT
const generateToken = (userId, role) => {
  const token = jwt.sign({ id: userId, role }, SECRET, { expiresIn: '7d' });
  console.log('🔑 [TOKEN-GEN] Generated token payload:', { id: userId, role });
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
    const token = generateToken(user.id, user.role);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en login' });
  }
};

// REGISTER - Crear nuevo usuario
exports.register = async (req, res) => {
  try {
    const { username, password, role = 'jugador', parent_id } = req.body;

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario
    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, role, parent_id, balance)
       VALUES (?, ?, ?, ?, ?)`,
      [username, hashedPassword, role, parent_id || null, 0.00]
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
    }

    const token = generateToken(newUser.id, newUser.role);

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
    const { userId, role } = req.user; // Del middleware authMiddleware

    const newToken = generateToken(userId, role);

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
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult[0];

    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña en la base de datos
    await pool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
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

