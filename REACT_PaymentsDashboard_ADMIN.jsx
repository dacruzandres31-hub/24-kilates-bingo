// ============================================
// DASHBOARD ADMIN: GESTIÓN DE PAGOS A GANADORES
// ============================================
// Ubicación: client-admin/src/pages/PaymentsDashboard.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Dashboard para que admins/cajeros procesen pagos a ganadores
 */
const PaymentsDashboard = () => {
  // Estado de pagos
  const [pendingPayments, setPendingPayments] = useState([]);
  const [processingPayments, setProcessingPayments] = useState([]);
  const [completedPayments, setCompletedPayments] = useState([]);
  
  // Filtros y búsqueda
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'processing', 'completed'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today'); // 'today', 'week', 'month', 'all'

  // Estado de acciones
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // ============================================
  // CARGAR DATOS
  // ============================================

  useEffect(() => {
    loadPayments();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadPayments, 30000);
    return () => clearInterval(interval);
  }, [activeTab, dateFilter]);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      if (activeTab === 'pending') {
        const response = await axios.get('/api/winners-payment/pending', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingPayments(response.data.data || []);
        
      } else {
        // Cargar historial con filtros
        const response = await axios.get('/api/winners-payment/history', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            status: activeTab === 'processing' ? 'processing' : 'completed',
            dateFilter: dateFilter
          }
        });
        
        if (activeTab === 'processing') {
          setProcessingPayments(response.data.data || []);
        } else {
          setCompletedPayments(response.data.data || []);
        }
      }
    } catch (error) {
      console.error('Error cargando pagos:', error);
      alert('Error al cargar pagos: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // PROCESAR PAGO
  // ============================================

  const handleProcessPayment = (payment) => {
    setSelectedPayment(payment);
    setShowProcessModal(true);
  };

  const confirmProcessPayment = async (receiptUrl, notes) => {
    try {
      const token = localStorage.getItem('adminToken');
      
      await axios.post(
        `/api/winners-payment/${selectedPayment.id}/process`,
        {
          paymentReceipt: receiptUrl,
          notes: notes
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('✅ Pago procesado exitosamente');
      setShowProcessModal(false);
      loadPayments(); // Recargar lista
      
    } catch (error) {
      console.error('Error procesando pago:', error);
      alert('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  // ============================================
  // RECHAZAR PAGO
  // ============================================

  const handleRejectPayment = (payment) => {
    setSelectedPayment(payment);
    setShowRejectModal(true);
  };

  const confirmRejectPayment = async (reason) => {
    try {
      const token = localStorage.getItem('adminToken');
      
      await axios.post(
        `/api/winners-payment/${selectedPayment.id}/reject`,
        { reason },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('❌ Pago rechazado');
      setShowRejectModal(false);
      loadPayments();
      
    } catch (error) {
      console.error('Error rechazando pago:', error);
      alert('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  // ============================================
  // COPIAR AL PORTAPAPELES
  // ============================================

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copiado al portapapeles: ${text}`);
  };

  // ============================================
  // FILTRAR PAGOS
  // ============================================

  const filterPayments = (payments) => {
    if (!searchTerm) return payments;
    
    const term = searchTerm.toLowerCase();
    return payments.filter(payment => 
      payment.username.toLowerCase().includes(term) ||
      payment.cbu.includes(term) ||
      payment.bank_account_holder.toLowerCase().includes(term)
    );
  };

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  const getStatistics = () => {
    const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.prize_amount), 0);
    const totalProcessing = processingPayments.reduce((sum, p) => sum + parseFloat(p.prize_amount), 0);
    const totalCompleted = completedPayments.reduce((sum, p) => sum + parseFloat(p.prize_amount), 0);

    return {
      pendingCount: pendingPayments.length,
      pendingAmount: totalPending,
      processingCount: processingPayments.length,
      processingAmount: totalProcessing,
      completedCount: completedPayments.length,
      completedAmount: totalCompleted
    };
  };

  const stats = getStatistics();

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="payments-dashboard">
      <div className="dashboard-header">
        <h1>💰 Gestión de Pagos a Ganadores</h1>
        <button className="btn-refresh" onClick={loadPayments}>
          🔄 Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      <div className="stats-cards">
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-label">Pendientes</div>
            <div className="stat-value">{stats.pendingCount}</div>
            <div className="stat-amount">${stats.pendingAmount.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card processing">
          <div className="stat-icon">⚙️</div>
          <div className="stat-content">
            <div className="stat-label">En Proceso</div>
            <div className="stat-value">{stats.processingCount}</div>
            <div className="stat-amount">${stats.processingAmount.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Completados</div>
            <div className="stat-value">{stats.completedCount}</div>
            <div className="stat-amount">${stats.completedAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pendientes ({stats.pendingCount})
        </button>
        <button
          className={`tab ${activeTab === 'processing' ? 'active' : ''}`}
          onClick={() => setActiveTab('processing')}
        >
          En Proceso ({stats.processingCount})
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completados ({stats.completedCount})
        </button>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por usuario, CBU o titular..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        {activeTab !== 'pending' && (
          <select
            className="date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="today">Hoy</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="all">Todo</option>
          </select>
        )}
      </div>

      {/* Lista de pagos */}
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando pagos...</p>
        </div>
      ) : (
        <div className="payments-list">
          {filterPayments(
            activeTab === 'pending' ? pendingPayments :
            activeTab === 'processing' ? processingPayments :
            completedPayments
          ).map(payment => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onProcess={handleProcessPayment}
              onReject={handleRejectPayment}
              onCopy={copyToClipboard}
              activeTab={activeTab}
            />
          ))}

          {filterPayments(
            activeTab === 'pending' ? pendingPayments :
            activeTab === 'processing' ? processingPayments :
            completedPayments
          ).length === 0 && (
            <div className="no-data">
              <p>No hay pagos en esta categoría</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Procesar pago */}
      {showProcessModal && (
        <ProcessPaymentModal
          payment={selectedPayment}
          onConfirm={confirmProcessPayment}
          onCancel={() => setShowProcessModal(false)}
        />
      )}

      {/* Modal: Rechazar pago */}
      {showRejectModal && (
        <RejectPaymentModal
          payment={selectedPayment}
          onConfirm={confirmRejectPayment}
          onCancel={() => setShowRejectModal(false)}
        />
      )}
    </div>
  );
};

// ============================================
// COMPONENTE: TARJETA DE PAGO
// ============================================

const PaymentCard = ({ payment, onProcess, onReject, onCopy, activeTab }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`payment-card ${expanded ? 'expanded' : ''}`}>
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <div className="card-main-info">
          <div className="user-avatar">👤</div>
          <div className="user-info">
            <div className="username">{payment.username}</div>
            <div className="prize-info">
              <span className="prize-badge">{payment.prize_type === 'linea' ? '📏 Línea' : '🎯 BINGO'}</span>
              <span className="prize-amount">${parseFloat(payment.prize_amount).toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="card-meta">
          <div className="created-date">
            {new Date(payment.created_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="expand-icon">{expanded ? '▲' : '▼'}</div>
        </div>
      </div>

      {expanded && (
        <div className="card-details">
          <div className="details-grid">
            <div className="detail-item">
              <label>CBU:</label>
              <div className="detail-value">
                <span className="monospace">{payment.cbu}</span>
                <button
                  className="btn-copy"
                  onClick={() => onCopy(payment.cbu, 'CBU')}
                >
                  📋
                </button>
              </div>
            </div>

            <div className="detail-item">
              <label>Titular:</label>
              <div className="detail-value">
                <span>{payment.bank_account_holder}</span>
                <button
                  className="btn-copy"
                  onClick={() => onCopy(payment.bank_account_holder, 'Titular')}
                >
                  📋
                </button>
              </div>
            </div>

            {payment.bank_name && (
              <div className="detail-item">
                <label>Banco:</label>
                <span>{payment.bank_name}</span>
              </div>
            )}

            <div className="detail-item">
              <label>Tipo de Cuenta:</label>
              <span>
                {payment.account_type === 'savings' ? 'Caja de Ahorro' :
                 payment.account_type === 'checking' ? 'Cuenta Corriente' : 'Otra'}
              </span>
            </div>

            <div className="detail-item">
              <label>WhatsApp:</label>
              <div className="detail-value">
                <span>{payment.whatsapp}</span>
                <a
                  href={`https://wa.me/${payment.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp"
                >
                  💬 Abrir
                </a>
              </div>
            </div>

            {payment.game_session_id && (
              <div className="detail-item">
                <label>Sesión de Juego:</label>
                <span>#{payment.game_session_id}</span>
              </div>
            )}
          </div>

          {activeTab === 'pending' && (
            <div className="card-actions">
              <button
                className="btn-action btn-process"
                onClick={() => onProcess(payment)}
              >
                ✅ Procesar Pago
              </button>
              <button
                className="btn-action btn-reject"
                onClick={() => onReject(payment)}
              >
                ❌ Rechazar
              </button>
            </div>
          )}

          {activeTab === 'completed' && payment.payment_receipt && (
            <div className="receipt-section">
              <label>Comprobante:</label>
              <a
                href={payment.payment_receipt}
                target="_blank"
                rel="noopener noreferrer"
                className="receipt-link"
              >
                📄 Ver comprobante
              </a>
              {payment.payment_date && (
                <div className="payment-date">
                  Pagado el {new Date(payment.payment_date).toLocaleString('es-AR')}
                </div>
              )}
            </div>
          )}

          {payment.notes && (
            <div className="notes-section">
              <label>Notas:</label>
              <p>{payment.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// MODAL: PROCESAR PAGO
// ============================================

const ProcessPaymentModal = ({ payment, onConfirm, onCancel }) => {
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!receiptUrl) {
      alert('Debes ingresar la URL del comprobante');
      return;
    }
    onConfirm(receiptUrl, notes);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>✅ Procesar Pago</h2>
        
        <div className="modal-info">
          <p><strong>Usuario:</strong> {payment.username}</p>
          <p><strong>Premio:</strong> {payment.prize_type === 'linea' ? 'Línea' : 'BINGO'}</p>
          <p><strong>Monto:</strong> ${parseFloat(payment.prize_amount).toLocaleString()}</p>
          <p><strong>CBU:</strong> {payment.cbu}</p>
          <p><strong>Titular:</strong> {payment.bank_account_holder}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>URL del Comprobante: *</label>
            <input
              type="text"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://ejemplo.com/comprobante.pdf"
              required
            />
            <small>Ingresa el link del comprobante de transferencia</small>
          </div>

          <div className="form-group">
            <label>Notas (opcional):</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones sobre el pago..."
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">
              Confirmar Pago
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// MODAL: RECHAZAR PAGO
// ============================================

const RejectPaymentModal = ({ payment, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason) {
      alert('Debes ingresar un motivo de rechazo');
      return;
    }
    onConfirm(reason);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>❌ Rechazar Pago</h2>
        
        <div className="modal-info">
          <p><strong>Usuario:</strong> {payment.username}</p>
          <p><strong>Monto:</strong> ${parseFloat(payment.prize_amount).toLocaleString()}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Motivo del Rechazo: *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ingresa el motivo por el cual se rechaza este pago..."
              rows={4}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-danger">
              Confirmar Rechazo
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentsDashboard;

/**
 * ============================================
 * ESTILOS CSS COMPLETOS
 * ============================================
 */
const styles = `
/* Contenedor principal */
.payments-dashboard {
  padding: 30px;
  background: #f5f5f5;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.btn-refresh {
  background: #4caf50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* Estadísticas */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.stat-icon {
  font-size: 50px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #333;
}

.stat-amount {
  color: #ffd700;
  font-size: 18px;
  font-weight: 600;
}

/* Tabs */
.tabs-container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.tab {
  padding: 15px 30px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.tab.active {
  color: #1976d2;
  border-bottom-color: #1976d2;
}

/* Filtros */
.filters-bar {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 12px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
}

/* Lista de pagos */
.payments-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* Tarjeta de pago */
.payment-card {
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: all 0.3s;
}

.payment-card:hover {
  box-shadow: 0 5px 20px rgba(0,0,0,0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  cursor: pointer;
}

.card-main-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-avatar {
  font-size: 40px;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.username {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.prize-info {
  display: flex;
  gap: 10px;
  margin-top: 5px;
}

.prize-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.prize-amount {
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
}

/* Detalles */
.card-details {
  padding: 0 20px 20px;
  border-top: 1px solid #e0e0e0;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.detail-item label {
  display: block;
  font-weight: 600;
  color: #666;
  margin-bottom: 5px;
}

.detail-value {
  display: flex;
  align-items: center;
  gap: 10px;
}

.monospace {
  font-family: monospace;
  font-size: 16px;
  background: #f5f5f5;
  padding: 5px 10px;
  border-radius: 5px;
}

.btn-copy,
.btn-whatsapp {
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.2s;
}

.btn-copy:hover,
.btn-whatsapp:hover {
  transform: scale(1.1);
}

/* Acciones */
.card-actions {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

.btn-action {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-process {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
}

.btn-reject {
  background: linear-gradient(135deg, #f44336 0%, #e53935 100%);
  color: white;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-content {
  background: white;
  border-radius: 20px;
  padding: 30px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-info {
  background: #f5f5f5;
  border-radius: 10px;
  padding: 15px;
  margin: 20px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
}

.modal-actions {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #4caf50;
  color: white;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}
`;
