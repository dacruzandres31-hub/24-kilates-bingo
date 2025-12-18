const pool = require('../db');

/**
 * ScheduleController - Gestión de horarios de sorteos
 * Endpoints para configurar y consultar horarios por sala
 */

/**
 * GET /api/admin/schedules
 * Obtener todos los horarios de sorteos
 */
exports.getAllSchedules = async (req, res) => {
  try {
    const [schedules] = await pool.query(`
      SELECT 
        id,
        room,
        day_of_week,
        hour,
        is_active,
        updated_at
      FROM schedule_settings
      ORDER BY 
        FIELD(room, 'starter', 'bronce', 'plata', 'oro'),
        day_of_week,
        hour
    `);

    // Agrupar por sala
    const grouped = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.room]) {
        acc[schedule.room] = [];
      }
      acc[schedule.room].push({
        id: schedule.id,
        dayOfWeek: schedule.day_of_week,
        hour: schedule.hour,
        isActive: schedule.is_active,
        updatedAt: schedule.updated_at
      });
      return acc;
    }, {});

    res.json({
      success: true,
      schedules: grouped,
      total: schedules.length
    });
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener horarios de sorteos',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/schedules/:room/next
 * Obtener próximos sorteos de una sala
 */
exports.getNextDraws = async (req, res) => {
  try {
    const { room } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Validar sala
    const validRooms = ['starter', 'bronce', 'plata', 'oro'];
    if (!validRooms.includes(room)) {
      return res.status(400).json({
        success: false,
        message: `Sala inválida. Use: ${validRooms.join(', ')}`
      });
    }

    // Usar procedure para obtener próximos sorteos
    const [draws] = await pool.query(
      'CALL get_next_draws(?, ?)',
      [room, limit]
    );

    res.json({
      success: true,
      room,
      nextDraws: draws[0] || [],
      count: draws[0]?.length || 0
    });
  } catch (error) {
    console.error('Error al obtener próximos sorteos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener próximos sorteos',
      error: error.message
    });
  }
};

/**
 * PUT /api/superadmin/schedules/:id/toggle
 * Activar/Desactivar un horario de sorteo
 */
exports.toggleSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Obtener estado actual
    const [current] = await pool.query(
      'SELECT id, room, hour, is_active FROM schedule_settings WHERE id = ?',
      [id]
    );

    if (current.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado'
      });
    }

    const newStatus = !current[0].is_active;

    // Actualizar estado
    await pool.query(
      `UPDATE schedule_settings 
       SET is_active = ?, updated_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [newStatus, userId, id]
    );

    res.json({
      success: true,
      message: `Horario ${newStatus ? 'activado' : 'desactivado'} correctamente`,
      schedule: {
        id: current[0].id,
        room: current[0].room,
        hour: current[0].hour,
        isActive: newStatus
      }
    });
  } catch (error) {
    console.error('Error al cambiar estado de horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado de horario',
      error: error.message
    });
  }
};

/**
 * POST /api/superadmin/schedules
 * Agregar nuevo horario de sorteo
 */
exports.addSchedule = async (req, res) => {
  try {
    const { room, dayOfWeek, hour } = req.body;
    const userId = req.user.id;

    // Validaciones
    const validRooms = ['starter', 'bronce', 'plata', 'oro'];
    if (!validRooms.includes(room)) {
      return res.status(400).json({
        success: false,
        message: `Sala inválida. Use: ${validRooms.join(', ')}`
      });
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({
        success: false,
        message: 'Día de semana inválido (0-6)'
      });
    }

    if (!hour || !/^\d{2}:\d{2}(:\d{2})?$/.test(hour)) {
      return res.status(400).json({
        success: false,
        message: 'Hora inválida. Formato: HH:MM o HH:MM:SS'
      });
    }

    // Verificar si ya existe
    const [existing] = await pool.query(
      `SELECT id FROM schedule_settings 
       WHERE room = ? AND day_of_week = ? AND hour = ?`,
      [room, dayOfWeek, hour]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un horario para esta sala, día y hora'
      });
    }

    // Insertar nuevo horario
    const [result] = await pool.query(
      `INSERT INTO schedule_settings (room, day_of_week, hour, is_active, updated_by)
       VALUES (?, ?, ?, TRUE, ?)`,
      [room, dayOfWeek, hour, userId]
    );

    res.status(201).json({
      success: true,
      message: 'Horario agregado correctamente',
      schedule: {
        id: result.insertId,
        room,
        dayOfWeek,
        hour,
        isActive: true
      }
    });
  } catch (error) {
    console.error('Error al agregar horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar horario',
      error: error.message
    });
  }
};

/**
 * DELETE /api/superadmin/schedules/:id
 * Eliminar horario de sorteo
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que existe
    const [existing] = await pool.query(
      'SELECT id, room, hour FROM schedule_settings WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado'
      });
    }

    // Eliminar
    await pool.query('DELETE FROM schedule_settings WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Horario eliminado correctamente',
      deleted: {
        id: existing[0].id,
        room: existing[0].room,
        hour: existing[0].hour
      }
    });
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar horario',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/schedules/summary
 * Resumen de sorteos por sala
 */
exports.getScheduleSummary = async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        room,
        COUNT(*) AS total_draws,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active_draws,
        GROUP_CONCAT(
          DISTINCT DATE_FORMAT(hour, '%H:%i') 
          ORDER BY hour 
          SEPARATOR ', '
        ) AS hours
      FROM schedule_settings
      GROUP BY room
      ORDER BY FIELD(room, 'starter', 'bronce', 'plata', 'oro')
    `);

    const formatted = summary.map(s => ({
      room: s.room,
      totalDraws: s.total_draws,
      activeDraws: s.active_draws,
      hours: s.hours
    }));

    res.json({
      success: true,
      summary: formatted
    });
  } catch (error) {
    console.error('Error al obtener resumen de horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de horarios',
      error: error.message
    });
  }
};

module.exports = exports;
