const sessionHistoryService = require('../services/sessionHistoryService');

/**
 * POST /api/admin/sessions/:id/archive
 * Archivar una sesión completada
 */
exports.archiveSession = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await sessionHistoryService.archiveSession(parseInt(id));
    
    res.json(result);
  } catch (error) {
    console.error('Error archivando sesión:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al archivar sesión'
    });
  }
};

/**
 * POST /api/admin/sessions/archive-all
 * Archivar todas las sesiones completadas
 */
exports.archiveAllCompleted = async (req, res) => {
  try {
    const result = await sessionHistoryService.archiveAllCompleted();
    
    res.json({
      success: true,
      message: `Archivado completado: ${result.success} exitosas, ${result.failed} fallidas`,
      ...result
    });
  } catch (error) {
    console.error('Error archivando sesiones:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al archivar sesiones'
    });
  }
};

/**
 * GET /api/admin/sessions/history
 * Obtener historial de sesiones
 */
exports.getHistory = async (req, res) => {
  try {
    const { room, limit = 50 } = req.query;
    
    const history = await sessionHistoryService.getSessionHistory(room, parseInt(limit));
    
    res.json({
      success: true,
      total: history.length,
      history
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener historial'
    });
  }
};

/**
 * GET /api/admin/sessions/history/:id
 * Obtener detalle de una sesión archivada
 */
exports.getHistoryDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const detail = await sessionHistoryService.getSessionHistoryDetail(parseInt(id));
    
    res.json({
      success: true,
      detail
    });
  } catch (error) {
    console.error('Error obteniendo detalle:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Registro no encontrado'
    });
  }
};
