const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbHelper = require('../helpers/dbHelper');
const responseHelper = require('../helpers/responseHelper');
const validationHelper = require('../helpers/validationHelper');
const gamificationEngine = require('../services/gamification_engine');

const SECRET = process.env.JWT_SECRET || '24k_secret_prod_secure_2025';

// Generar JWT
const generateToken = (userId, role, username) => {
  const token = jwt.sign({ id: userId, role, username }, SECRET, { expiresIn: '30d' });
  // console.log('🔑 [TOKEN-GEN] Generated token payload:', { id: userId, role, username });
  return token;
};

// Helper to generate a unique referral code
const generateReferralCode = async () => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I to avoid confusion
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const existing = await dbHelper.queryOne(
      'SELECT id FROM users WHERE referral_code = ?',
      [code],
      'CheckReferralCodeUniqueness'
    );
    if (!existing) isUnique = true;
  }
  return code;
};

// LOGIN - Validar credenciales y retornar token
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const missingField = validationHelper.checkRequired(req.body, ['username', 'password']);
    if (missingField) {
      return responseHelper.error(res, 400, `Campo requerido faltante: ${missingField}`);
    }

    // Buscar usuario
    const user = await dbHelper.queryOne(
      'SELECT id, username, role, password_hash, balance, is_blocked, block_reason, referral_code FROM users WHERE username = ?',
      [username],
      'LoginUserSearch'
    );

    if (!user) {
      return responseHelper.unauthorized(res, 'Usuario o contraseña inválidos');
    }

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
      return responseHelper.unauthorized(res, 'Usuario o contraseña inválidos');
    }

    // Generar token
    const token = generateToken(user.id, user.role, user.username);

    // Check Daily Streak
    let streakData = null;
    try {
      streakData = await gamificationEngine.checkDailyStreak(user.id);
    } catch (e) {
      console.error('Login streak error:', e);
    }

    return responseHelper.success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        balance: user.balance,
        referral_code: user.referral_code
      },
      gamification: {
        streak: streakData
      }
    }, 'Login exitoso');

  } catch (error) {
    return responseHelper.error(res, 500, 'Error en login', error.message);
  }
};

// REGISTER - Crear nuevo usuario
exports.register = async (req, res) => {
  try {
    const { username, password, role = 'jugador', parent_id, ref } = req.body;

    const missingField = validationHelper.checkRequired(req.body, ['username', 'password']);
    if (missingField) {
      return responseHelper.error(res, 400, `Campo requerido faltante: ${missingField}`);
    }

    // Validar rol
    const validRoles = ['superadmin', 'agente', 'jugador'];
    if (!validRoles.includes(role)) {
      return responseHelper.error(res, 400, 'Rol inválido');
    }

    // Verificar duplicado
    const existingUser = await dbHelper.queryOne(
      'SELECT id FROM users WHERE username = ?',
      [username],
      'RegisterCheckDuplicate'
    );

    if (existingUser) {
      return responseHelper.error(res, 409, 'Usuario ya existe');
    }

    // Buscar referente si existe código 'ref'
    let referrerId = null;
    let finalParentId = parent_id || null;

    if (ref) {
      const referrer = await dbHelper.queryOne(
        'SELECT id, role, parent_id FROM users WHERE referral_code = ?',
        [ref],
        'RegisterFindReferrer'
      );
      if (referrer) {
        referrerId = referrer.id;

        // LÓGICA DE RED:
        if (referrer.role === 'agente') {
          // Si el que refiere es un agente, él es el padre directo
          finalParentId = referrer.id;
        } else if (referrer.role === 'jugador') {
          // Si el que refiere es otro jugador, el nuevo jugador hereda el mismo agente (parent_id)
          finalParentId = referrer.parent_id;
        }

        console.log(`🔗 Registro via REF: ${ref}. Referente: ${referrer.role} (ID: ${referrerId}) -> ParentID: ${finalParentId}`);
      }
    }

    // Generar código de referido propio
    const referralCode = await generateReferralCode();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario (Forzando role jugador para auto-registro si no viene de un flujo admin)
    // Nota: El usuario pidió que se cree "solo usuario y contraseña", asumo que es para jugadores.
    const result = await dbHelper.query(
      `INSERT INTO users (username, password_hash, role, parent_id, balance, referral_code, referred_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, role || 'jugador', finalParentId, 0.00, referralCode, referrerId],
      'RegisterInsertUser'
    );

    const newUserId = result.insertId;

    // Obtener el usuario recién creado
    const newUser = await dbHelper.queryOne(
      'SELECT id, username, role, balance, referral_code FROM users WHERE id = ?',
      [newUserId],
      'RegisterGetUser'
    );

    // Auto-inicializar gamificación para jugadores
    if (role === 'jugador') {
      try {
        await dbHelper.transaction(async (connection) => {
          // Crear progreso
          await connection.execute(`
            INSERT INTO gamification_progress (user_id, current_level, xp_current, xp_lifetime)
            VALUES (?, 1, 0, 0)
          `, [newUser.id]);

          // Crear quests iniciales
          await connection.execute(`
            INSERT INTO daily_quests (user_id, quest_name, quest_type, target_value, xp_reward)
            VALUES 
              (?, 'Primera victoria', 'WIN', 1, 100),
              (?, 'Jugar 3 partidas', 'PLAY', 3, 50),
              (?, 'Completar un cartón', 'COMPLETE_CARD', 1, 75)
          `, [newUser.id, newUser.id, newUser.id]);
        });
        console.log(`✓ Gamificación inicializada para ${newUser.username}`);
      } catch (gamErr) {
        console.error('⚠️ Error inicializando gamificación:', gamErr.message);
        // No bloquear el registro si falla gamificación
      }
    }

    const token = generateToken(newUser.id, newUser.role, newUser.username);

    return responseHelper.created(res, {
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        balance: newUser.balance,
        referral_code: newUser.referral_code
      }
    }, 'Usuario registrado exitosamente');

  } catch (error) {
    return responseHelper.error(res, 500, 'Error en registro', error.message);
  }
};

// REFRESH TOKEN - Renovar token expirado
exports.refreshToken = async (req, res) => {
  try {
    const { id, role } = req.user;

    // Obtener username actualizado de la BD
    const user = await dbHelper.queryOne(
      'SELECT username, role, is_blocked FROM users WHERE id = ?',
      [id],
      'RefreshTokenGetUser'
    );

    if (!user || user.is_blocked) {
      return responseHelper.unauthorized(res, 'Usuario no válido o bloqueado');
    }

    const newToken = generateToken(id, user.role, user.username);

    return responseHelper.success(res, { token: newToken }, 'Token renovado');
  } catch (error) {
    return responseHelper.error(res, 500, 'Error renovando token', error.message);
  }
};

// LOGOUT - Invalidar token
exports.logout = async (req, res) => {
  return responseHelper.success(res, null, 'Logout exitoso');
};

// VERIFY TOKEN - Verificar si el token es válido
exports.verifyToken = async (req, res) => {
  try {
    const { userId, role } = req.user;
    return responseHelper.success(res, {
      valid: true,
      user: { userId, role }
    }, 'Token válido');
  } catch (error) {
    return responseHelper.unauthorized(res, 'Token inválido');
  }
};

// CHANGE PASSWORD - Cambiar contraseña del usuario autenticado
exports.changePassword = async (req, res) => {
  try {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    const missingField = validationHelper.checkRequired(req.body, ['currentPassword', 'newPassword']);
    if (missingField) {
      return responseHelper.error(res, 400, `Requerido: ${missingField}`);
    }

    if (newPassword.length < 6) {
      return responseHelper.error(res, 400, 'La nueva contraseña debe tener al menos 6 caracteres');
    }

    // Obtener contraseña actual del usuario
    const user = await dbHelper.queryOne(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId],
      'ChangePassGetUser'
    );

    if (!user) {
      return responseHelper.notFound(res, 'Usuario no encontrado');
    }

    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return responseHelper.unauthorized(res, 'Contraseña actual incorrecta');
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña en la base de datos
    await dbHelper.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId],
      'ChangePassUpdate'
    );

    return responseHelper.success(res, null, 'Contraseña actualizada exitosamente');
  } catch (error) {
    return responseHelper.error(res, 500, 'Error al cambiar contraseña', error.message);
  }
};

