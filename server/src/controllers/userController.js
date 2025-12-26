const pool = require('../db');

/**
 * USER CONTROLLER - Gestión de Usuarios
 * 
 * Responsabilidades:
 * - CRUD de usuarios
 * - Duplicado checking
 * - Red jerárquica (multinivel)
 * - Network traversal
 */

// CREATE - Crear nuevo usuario
exports.createUser = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { username, password, newRole = 'jugador', parent_id } = req.body;

    // Solo admins pueden crear usuarios
    if (role !== 'superadmin' && role !== 'agente') {
      return res.status(403).json({ error: 'No autorizado para crear usuarios' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password requeridos' });
    }

    // Validar rol
    const validRoles = ['agente', 'jugador'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Verificar duplicado (MURO FINAL)
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Usuario ya existe' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validar parent_id si se proporciona
    let validParentId = parent_id;
    if (parent_id) {
      const [parentResult] = await pool.query(
        'SELECT id, role FROM users WHERE id = ?',
        [parent_id]
      );

      if (parentResult.length === 0) {
        return res.status(400).json({ error: 'Parent user no encontrado' });
      }

      // SuperAdmin no puede tener parent
      if (newRole === 'superadmin') {
        return res.status(400).json({ error: 'SuperAdmin no puede tener parent' });
      }
    } else {
      // Asignar parent actual si no se especifica
      validParentId = role === 'superadmin' ? null : userId;
    }

    // Insertar usuario
    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, role, parent_id, balance)
       VALUES (?, ?, ?, ?, ?)`,
      [username, hashedPassword, newRole, validParentId, 0.00]
    );

    const [newUserResult] = await pool.query(
      'SELECT id, username, role, parent_id, balance, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    const newUser = newUserResult[0];

    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Error creando usuario' });
  }
};

// READ - Obtener usuario por ID
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT id, username, role, parent_id, balance, can_process_payouts, 
              last_deposit_at, created_at
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error obteniendo usuario' });
  }
};

// READ ALL - Listar todos los usuarios (admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'superadmin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Contar total
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
    const total = countResult[0].total;

    // Obtener usuarios paginados
    const [result] = await pool.query(
      `SELECT id, username, role, parent_id, balance, created_at,
              is_blocked, block_reason, blocked_at, blocked_by
       FROM users
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      users: result,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
};

// UPDATE - Actualizar usuario
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { balance, can_process_payouts } = req.body;
    const { role } = req.user;

    if (role !== 'superadmin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Construir update dinámico
    const updates = [];
    const params = [];

    if (balance !== undefined) {
      updates.push(`balance = ?`);
      params.push(balance);
    }

    if (can_process_payouts !== undefined) {
      updates.push(`can_process_payouts = ?`);
      params.push(can_process_payouts);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nada para actualizar' });
    }

    // Add userId at the end for WHERE clause
    params.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;

    await pool.query(query, params);

    // Get updated user
    const [result] = await pool.query(
      'SELECT id, username, role, balance, can_process_payouts FROM users WHERE id = ?',
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: result[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
};

// DELETE - Eliminar usuario (soft delete con cascada)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.user;

    if (role !== 'superadmin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Verificar si el usuario existe
    const [userResult] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // 1. Reasignar children a null (huérfanos)
      await connection.query(
        'UPDATE users SET parent_id = NULL WHERE parent_id = ?',
        [userId]
      );

      // 2. Marcar cartones como discarded
      await connection.query(
        `UPDATE daily_stock_cards SET status = 'discarded'
         WHERE buyer_id = ?`,
        [userId]
      );

      // 3. Eliminar usuario
      await connection.query('DELETE FROM users WHERE id = ?', [userId]);

      // 4. Auditoría
      await connection.query(
        `INSERT INTO audit_revenue (amount, transaction_type)
         VALUES (?, ?)`,
        [userId, 'user_deleted']
      );

      await connection.query('COMMIT');

      res.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
};

// SPECIAL - Obtener red de usuarios (árbol jerárquico)
exports.getUserNetwork = async (req, res) => {
  try {
    const { userId } = req.params;

    // Query recursiva: obtener árbol desde usuario hasta raíz
    const [result] = await pool.query(
      `WITH RECURSIVE user_hierarchy AS (
         SELECT id, username, role, parent_id, balance, 1 as depth
         FROM users WHERE id = ?
         UNION ALL
         SELECT u.id, u.username, u.role, u.parent_id, u.balance, uh.depth + 1
         FROM users u
         INNER JOIN user_hierarchy uh ON u.id = uh.parent_id
       )
       SELECT * FROM user_hierarchy
       ORDER BY depth ASC`,
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Construir árbol
    const tree = {
      user: result[0],
      ancestors: result.slice(1)
    };

    // Obtener descendientes
    const [descendantsResult] = await pool.query(
      `WITH RECURSIVE descendants AS (
         SELECT id, username, role, parent_id, balance, 1 as depth
         FROM users WHERE parent_id = ?
         UNION ALL
         SELECT u.id, u.username, u.role, u.parent_id, u.balance, d.depth + 1
         FROM users u
         INNER JOIN descendants d ON u.parent_id = d.id
       )
       SELECT * FROM descendants
       ORDER BY depth ASC`,
      [userId]
    );

    tree.descendants = descendantsResult;

    res.json(tree);
  } catch (error) {
    console.error('Get user network error:', error);
    res.status(500).json({ error: 'Error obteniendo red' });
  }
};

// SPECIAL - Obtener estadísticas de red (downline)
exports.getNetworkStats = async (req, res) => {
  try {
    const { userId } = req.user;

    const [result] = await pool.query(
      `WITH RECURSIVE downline AS (
         SELECT id, role, 1 as depth
         FROM users WHERE parent_id = ?
         UNION ALL
         SELECT u.id, u.role, d.depth + 1
         FROM users u
         INNER JOIN downline d ON u.parent_id = d.id
       )
       SELECT 
         role, COUNT(*) as count, MAX(depth) as max_depth
       FROM downline
       GROUP BY role`,
      [userId]
    );

    // Calcular stats
    const stats = {
      totalAgentes: 0,
      totalJugadores: 0,
      maxDepth: 0
    };

    for (const row of result) {
      if (row.role === 'agente') stats.totalAgentes = row.count;
      if (row.role === 'jugador') stats.totalJugadores = row.count;
      stats.maxDepth = Math.max(stats.maxDepth, row.max_depth || 0);
    }

    res.json(stats);
  } catch (error) {
    console.error('Get network stats error:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
};

/**
 * GET /api/users/profile
 * Obtener perfil del usuario autenticado con sus recursos
 */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // El token contiene 'id', no 'userId'

    console.log('[getUserProfile] 🔍 Buscando usuario ID:', userId);

    // Obtener datos del usuario
    const [users] = await pool.query(
      'SELECT id, username, role, balance FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      console.log('[getUserProfile] ❌ Usuario no encontrado:', userId);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];
    console.log('[getUserProfile] ✅ Usuario encontrado:', user.username);

    // Obtener cartones disponibles separados por tipo (igual que adminController)
    // Esto asegura que la suma sea consistente con lo que ve el admin
    const [inventory] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_bronce,
        COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_plata,
        COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_oro,
        COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_bronce,
        COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_plata,
        COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_oro
       FROM user_card_inventory
       WHERE user_id = ?`,
      [userId]
    );

    const data = inventory[0] || {};

    // Sumar normales + regalo para el jugador
    const bronzeTotal = (parseInt(data.cards_bronce) || 0) + (parseInt(data.gift_bronce) || 0);
    const silverTotal = (parseInt(data.cards_plata) || 0) + (parseInt(data.gift_plata) || 0);
    const goldTotal = (parseInt(data.cards_oro) || 0) + (parseInt(data.gift_oro) || 0);

    console.log('[getUserProfile] 🎴 Tickets (N+R):', {
      bronze: `${data.cards_bronce}+${data.gift_bronce}=${bronzeTotal}`,
      silver: `${data.cards_plata}+${data.gift_plata}=${silverTotal}`,
      gold: `${data.cards_oro}+${data.gift_oro}=${goldTotal}`
    });

    const response = {
      username: user.username,
      balance: user.balance || 0,
      tickets: {
        starter: 0, // Starter se maneja aparte
        bronze: bronzeTotal,
        silver: silverTotal,
        gold: goldTotal
      }
    };

    console.log('[getUserProfile] 📤 Enviando respuesta:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ Error obteniendo perfil de usuario:', error);
    res.status(500).json({ error: 'Error obteniendo perfil' });
  }
};

// BLOCK - Bloquear usuario
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const performedBy = req.user.id;

    // Validar que se proporcione un motivo
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Debe proporcionar un motivo para el bloqueo' });
    }

    // Verificar que el usuario existe
    const [user] = await pool.query(
      'SELECT id, username, role, is_blocked FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que no esté ya bloqueado
    if (user[0].is_blocked) {
      return res.status(400).json({ error: 'Usuario ya está bloqueado' });
    }

    // No se puede bloquear a un SuperAdmin
    if (user[0].role === 'superadmin') {
      return res.status(403).json({ error: 'No se puede bloquear a un SuperAdmin' });
    }

    // Bloquear el usuario
    await pool.query(
      `UPDATE users 
       SET is_blocked = TRUE, 
           block_reason = ?, 
           blocked_at = NOW(), 
           blocked_by = ?
       WHERE id = ?`,
      [reason.trim(), performedBy, userId]
    );

    // Registrar en log de bloqueos
    await pool.query(
      `INSERT INTO user_blocks_log (user_id, action, reason, performed_by)
       VALUES (?, 'block', ?, ?)`,
      [userId, reason.trim(), performedBy]
    );

    res.json({
      success: true,
      message: `Usuario ${user[0].username} bloqueado exitosamente`,
      user: {
        id: userId,
        username: user[0].username,
        is_blocked: true,
        block_reason: reason.trim(),
        blocked_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error bloqueando usuario:', error);
    res.status(500).json({ error: 'Error al bloquear usuario' });
  }
};

/**
 * Helper: Verificar si un usuario puede desbloquear a otro
 * - Andy (SuperAdmin) puede desbloquear a cualquiera
 * - Si Andy bloqueó al usuario, solo Andy puede desbloquear
 * - Puede desbloquear quien bloqueó al usuario
 * - Puede desbloquear un agente superior en la jerarquía del usuario bloqueado
 */
async function canUnblockUser(performerId, performerRole, blockedUserId, blockerId) {
  // Si el performer es quien bloqueó, puede desbloquear
  if (performerId === blockerId) {
    return true;
  }

  // SuperAdmin puede desbloquear a cualquiera (ya verificado antes)
  if (performerRole === 'superadmin') {
    return true;
  }

  // Verificar si el performer es un agente superior en la jerarquía del BLOQUEADOR (no del bloqueado)
  // Usamos CTE recursivo para verificar toda la cadena jerárquica
  if (performerRole === 'agente') {
    const [result] = await pool.query(`
      WITH RECURSIVE hierarchy AS (
        -- Caso base: el BLOQUEADOR (quien bloqueó al usuario)
        SELECT id, parent_id, 1 as level
        FROM users 
        WHERE id = ?
        
        UNION ALL
        
        -- Caso recursivo: subir por la jerarquía hasta encontrar al performer o llegar a la raíz
        SELECT u.id, u.parent_id, h.level + 1
        FROM users u
        INNER JOIN hierarchy h ON u.id = h.parent_id
        WHERE u.parent_id IS NOT NULL
      )
      SELECT COUNT(*) as count 
      FROM hierarchy 
      WHERE id = ?
    `, [blockerId, performerId]);

    return result[0].count > 0;
  }

  // Jugadores no pueden desbloquear a nadie
  return false;
}

// UNBLOCK - Desbloquear usuario
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const performedBy = req.user.id;
    const performedByRole = req.user.role;

    console.log('🔓 [UNBLOCK] Inicio - UserID:', userId, 'PerformedBy:', performedBy, 'Role:', performedByRole);

    // Verificar que el usuario existe y está bloqueado
    const [user] = await pool.query(
      'SELECT id, username, is_blocked, block_reason, blocked_by FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user[0].is_blocked) {
      return res.status(400).json({ error: 'Usuario no está bloqueado' });
    }

    // Obtener información del usuario que realiza el desbloqueo
    const [performerInfo] = await pool.query(
      'SELECT username FROM users WHERE id = ?',
      [performedBy]
    );

    console.log('🔓 [UNBLOCK] Performer:', performerInfo[0]);

    const isAndy = performerInfo[0].username === 'Andy';
    console.log('🔓 [UNBLOCK] ¿Es Andy?:', isAndy);

    // REGLA 1: Andy puede desbloquear a cualquiera
    if (isAndy) {
      console.log('🔓 [UNBLOCK] REGLA 1: Andy puede desbloquear - PERMITIDO');
      // Andy tiene permiso total
    }
    // REGLA 2: Si Andy bloqueó al usuario, solo Andy puede desbloquearlo
    else if (user[0].blocked_by) {
      console.log('🔓 [UNBLOCK] Usuario fue bloqueado por ID:', user[0].blocked_by);
      const [blockerInfo] = await pool.query(
        'SELECT username FROM users WHERE id = ?',
        [user[0].blocked_by]
      );

      console.log('🔓 [UNBLOCK] Bloqueador:', blockerInfo[0]);

      if (blockerInfo.length > 0 && blockerInfo[0].username === 'Andy') {
        console.log('🔓 [UNBLOCK] REGLA 2: Bloqueado por Andy - Solo Andy puede desbloquear - DENEGADO');
        return res.status(403).json({
          error: 'Solo el SuperAdmin puede desbloquear a este usuario',
          reason: 'Este usuario fue bloqueado por el SuperAdmin. Comunícate con tu Agente Superior para más información.',
          blockedBy: 'SuperAdmin'
        });
      }

      // REGLA 3: Solo puede desbloquear quien bloqueó o un superior jerárquico
      if (user[0].blocked_by !== performedBy) {
        console.log('🔓 [UNBLOCK] No es el mismo bloqueador, verificando jerarquía...');

        // Obtener información del bloqueador para mensaje personalizado
        const [blocker] = await pool.query(
          'SELECT username, role FROM users WHERE id = ?',
          [user[0].blocked_by]
        );

        // Verificar si el que intenta desbloquear es superior en la jerarquía del bloqueado
        const canUnblock = await canUnblockUser(performedBy, performedByRole, userId, user[0].blocked_by);
        console.log('🔓 [UNBLOCK] ¿Puede desbloquear?:', canUnblock);

        if (!canUnblock) {
          // Mensaje personalizado según quién bloqueó
          if (blocker.length > 0 && blocker[0].role === 'agente') {
            console.log('🔓 [UNBLOCK] DENEGADO - Bloqueado por agente superior');
            return res.status(403).json({
              error: 'Este usuario fue bloqueado por un Agente Superior',
              reason: 'Comunícate con tu superior',
              blockedBy: blocker[0].username
            });
          } else {
            return res.status(403).json({
              error: 'No tienes permiso para desbloquear a este usuario',
              reason: 'Solo puede desbloquear quien bloqueó el usuario o un superior en la jerarquía'
            });
          }
        }
      }
    }

    // Desbloquear el usuario
    console.log('🔓 [UNBLOCK] PERMITIDO - Procediendo a desbloquear...');
    await pool.query(
      `UPDATE users 
       SET is_blocked = FALSE, 
           block_reason = NULL, 
           blocked_at = NULL, 
           blocked_by = NULL
       WHERE id = ?`,
      [userId]
    );

    // Registrar en log de bloqueos
    await pool.query(
      `INSERT INTO user_blocks_log (user_id, action, reason, performed_by)
       VALUES (?, 'unblock', ?, ?)`,
      [userId, 'Desbloqueado por administrador', performedBy]
    );

    res.json({
      success: true,
      message: `Usuario ${user[0].username} desbloqueado exitosamente`,
      user: {
        id: userId,
        username: user[0].username,
        is_blocked: false
      }
    });

  } catch (error) {
    console.error('Error desbloqueando usuario:', error);
    res.status(500).json({ error: 'Error al desbloquear usuario' });
  }
};

