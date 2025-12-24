// ============================================
// CONTROLADOR DE RETIROS (WITHDRAWALS)
// ============================================

const ChipsService = require('../services/chipsService');

// ============================================
// CREAR SOLICITUD DE RETIRO (Jugador)
// ============================================
exports.createWithdrawalRequest = async (req, res) => {
  try {
    const userId = req.user.id; // Usuario autenticado
    let { amount, bankAccountHolder, cbu, bankName, accountType, notes, method } = req.body;

    console.log('[DEBUG] createWithdrawalRequest - userId:', userId, 'amount:', amount);

    // ADAPTADOR PARA FRONTEND SIMPLIFICADO
    // Si viene 'notes' pero no 'cbu', usamos 'notes' como el identificador de destino (CBU/Alias)
    if (!cbu && notes) {
      cbu = notes;
    }

    // Si no viene titular, usamos 'Usuario' o el nombre del metodo
    if (!bankAccountHolder) {
      bankAccountHolder = 'Consultar Notas/Perfil';
    }

    // Si viene 'method' (cbu/alias) lo usamos como bankName
    if (!bankName && method) {
      bankName = method.toUpperCase();
    }

    if (!amount || !bankAccountHolder || !cbu) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos: amount y datos de cuenta (CBU/Alias) son requeridos'
      });
    }

    const result = await ChipsService.createWithdrawalRequest(
      userId,
      parseFloat(amount),
      bankAccountHolder,
      cbu,
      bankName,
      accountType || 'savings'
    );

    res.json({
      success: true,
      message: 'Solicitud de retiro creada exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error creando solicitud de retiro:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// PROCESAR RETIRO (Admin/Cajero)
// ============================================
exports.processWithdrawalRequest = async (req, res) => {
  try {
    const { withdrawalRequestId } = req.params;
    const { transferReceipt } = req.body;
    const processorId = req.user.id;
    const processorRole = req.user.role; // 'cajero' o 'superadmin'

    // Validar rol
    if (processorRole !== 'cajero' && processorRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para procesar retiros'
      });
    }

    const result = await ChipsService.processWithdrawalRequest(
      parseInt(withdrawalRequestId),
      processorId,
      processorRole,
      transferReceipt
    );

    res.json({
      success: true,
      message: 'Retiro procesado exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error procesando retiro:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// RECHAZAR SOLICITUD DE RETIRO (Admin)
// ============================================
exports.rejectWithdrawalRequest = async (req, res) => {
  try {
    const { withdrawalRequestId } = req.params;
    const { rejectionReason } = req.body;
    const processorId = req.user.id;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'rejectionReason es requerido'
      });
    }

    const result = await ChipsService.rejectWithdrawalRequest(
      parseInt(withdrawalRequestId),
      processorId,
      rejectionReason
    );

    res.json({
      success: true,
      message: 'Solicitud de retiro rechazada',
      data: result
    });

  } catch (error) {
    console.error('Error rechazando retiro:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// OBTENER SOLICITUDES PENDIENTES
// ============================================
exports.getPendingWithdrawals = async (req, res) => {
  try {
    const { userId, limit, offset } = req.query;

    // Si no es admin/cajero, solo puede ver sus propias solicitudes
    let filterUserId = null;
    if (req.user.role === 'player') {
      filterUserId = req.user.id;
    } else if (userId) {
      filterUserId = parseInt(userId);
    }

    const filters = {
      userId: filterUserId,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    };

    const requests = await ChipsService.getPendingWithdrawals(filters);

    res.json({
      success: true,
      data: requests,
      total: requests.length
    });

  } catch (error) {
    console.error('Error obteniendo solicitudes pendientes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// HISTORIAL DE RETIROS
// ============================================
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const { userId, status, startDate, endDate, limit, offset } = req.query;

    // Si no es admin/cajero, solo puede ver su propio historial
    let filterUserId = null;
    if (req.user.role === 'player') {
      filterUserId = req.user.id;
    } else if (userId) {
      filterUserId = parseInt(userId);
    }

    const filters = {
      status,
      startDate,
      endDate,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    };

    const requests = await ChipsService.getWithdrawalHistory(filterUserId, filters);

    res.json({
      success: true,
      data: requests,
      total: requests.length
    });

  } catch (error) {
    console.error('Error obteniendo historial de retiros:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// VERIFICAR PERMISOS PARA RETIRO (Útil para UI)
// ============================================
exports.checkWithdrawalPermissions = async (req, res) => {
  try {
    const { withdrawalRequestId } = req.params;
    const processorRole = req.user.role;

    const connection = require('../db');

    // Obtener solicitud de retiro
    const [requests] = await connection.query(
      'SELECT * FROM withdrawal_requests WHERE id = ?',
      [withdrawalRequestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    const request = requests[0];

    // Obtener minutos desde última acreditación
    const [minutesData] = await connection.query(
      'SELECT get_minutes_since_last_credit(?) as minutes',
      [request.user_id]
    );

    const minutes = minutesData[0].minutes;

    // Determinar permisos
    const canProcess = processorRole === 'superadmin' ||
      (processorRole === 'cajero' && minutes < 20);

    res.json({
      success: true,
      data: {
        withdrawalRequestId: parseInt(withdrawalRequestId),
        userId: request.user_id,
        amount: parseFloat(request.amount),
        minutesSinceCredit: minutes,
        processorRole,
        canProcess,
        reason: canProcess
          ? 'Tiene permisos para procesar este retiro'
          : `Requiere superadmin. Han pasado ${minutes} minutos desde la última acreditación.`
      }
    });

  } catch (error) {
    console.error('Error verificando permisos:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
