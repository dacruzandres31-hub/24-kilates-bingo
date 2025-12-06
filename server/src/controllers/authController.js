const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const SECRET = process.env.JWT_SECRET || 'tu_super_secret_key_24k';

// Generar JWT
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, SECRET, { expiresIn: '7d' });
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
      'SELECT id, username, role, password_hash, balance FROM users WHERE username = ?',
      [username]
    );

    if (userResult.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    const user = userResult[0];

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
