// ============================================
// COMPONENTE: SOLICITUDES DE RETIRO
// ============================================
// Gestión de solicitudes de retiro de jugadores
// Estados: pending, processed, rejected

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function SolicitudesRetiro({ userData }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('pending');
  
  // Verificar si el usuario es SuperAdmin (Andy)
  const isSuperAdmin = userData?.role === 'superadmin';
  
  // Modal para procesar/rechazar
  const [modalAction, setModalAction] = useState({ 
    isOpen: false, 
    type: '', // 'process' o 'reject'
    solicitud: null 
  });
  const [actionData, setActionData] = useState({
    transferReceipt: '',
    rejectionReason: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSolicitudes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');

      let endpoint = '/api/withdrawals/all';
      const params = new URLSearchParams();
      if (filtroEstado) params.append('status', filtroEstado);

      const { data } = await axios.get(`${API_URL}${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const requests = Array.isArray(data) ? data : (data.data || []);
      setSolicitudes(requests);
      setError(null);
    } catch (err) {
      console.error('Error fetching solicitudes:', err);
      setSolicitudes([]);
      setError(err.response?.data?.message || err.response?.data?.error || 'Error cargando solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessWithdrawal = async () => {
    if (!actionData.transferReceipt.trim()) {
      alert('Debe ingresar el comprobante de transferencia');
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('adminToken');

      await axios.post(
        `${API_URL}/api/withdrawals/${modalAction.solicitud.id}/process`,
        { transferReceipt: actionData.transferReceipt },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('✅ Retiro procesado exitosamente');
      closeModal();
      fetchSolicitudes();
    } catch (err) {
      console.error('Error procesando retiro:', err);
      alert(err.response?.data?.message || 'Error procesando retiro');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!actionData.rejectionReason.trim()) {
      alert('Debe ingresar el motivo del rechazo');
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('adminToken');

      await axios.post(
        `${API_URL}/api/withdrawals/${modalAction.solicitud.id}/reject`,
        { rejectionReason: actionData.rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('✅ Solicitud rechazada');
      closeModal();
      fetchSolicitudes();
    } catch (err) {
      console.error('Error rechazando solicitud:', err);
      alert(err.response?.data?.message || 'Error rechazando solicitud');
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (type, solicitud) => {
    setModalAction({ isOpen: true, type, solicitud });
    setActionData({ transferReceipt: '', rejectionReason: '' });
  };

  const closeModal = () => {
    setModalAction({ isOpen: false, type: '', solicitud: null });
    setActionData({ transferReceipt: '', rejectionReason: '' });
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pendiente', color: 'bg-yellow-600', icon: '⏳' },
      processed: { text: 'Procesado', color: 'bg-green-600', icon: '✅' },
      rejected: { text: 'Rechazado', color: 'bg-red-600', icon: '❌' }
    };
    return badges[status] || badges.pending;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setFiltroEstado('pending')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            filtroEstado === 'pending'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ⏳ Pendientes
        </button>
        <button
          onClick={() => setFiltroEstado('processed')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            filtroEstado === 'processed'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ✅ Procesados
        </button>
        <button
          onClick={() => setFiltroEstado('rejected')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            filtroEstado === 'rejected'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ❌ Rechazados
        </button>
        <button
          onClick={() => setFiltroEstado('')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            filtroEstado === ''
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          📋 Todos
        </button>

        <button
          onClick={fetchSolicitudes}
          className="ml-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          🔄 Refrescar
        </button>
      </div>

      {/* Lista de Solicitudes */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando solicitudes...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
          <p className="text-red-400">❌ {error}</p>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          📭 No hay solicitudes de retiro en estado: <span className="text-white font-semibold">{filtroEstado || 'todos'}</span>
        </div>
      ) : (
        <>
          <div className="bg-gray-900/30 rounded-lg p-4 mb-4">
            <p className="text-gray-400">
              📊 Total de solicitudes: <span className="text-white font-semibold">{Array.isArray(solicitudes) ? solicitudes.length : 0}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {Array.isArray(solicitudes) && solicitudes.map((solicitud) => {
              const badge = getStatusBadge(solicitud.status);
              
              return (
                <div key={solicitud.id} className="bg-gray-900/50 rounded-lg border border-gray-700 p-6 hover:border-emerald-600/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {solicitud.username}
                        <span className="text-gray-500 text-sm ml-2">#{solicitud.user_id}</span>
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Solicitud #{solicitud.id} • {formatDate(solicitud.created_at)}
                      </p>
                    </div>
                    <span className={`${badge.color} px-4 py-2 rounded-lg text-white font-medium`}>
                      {badge.icon} {badge.text}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">💰 Monto</p>
                      <p className="text-2xl font-bold text-emerald-400">{formatMoney(solicitud.amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">👤 Titular de Cuenta</p>
                      <p className="text-white font-medium">{solicitud.bank_account_holder}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">🏦 CBU</p>
                      <p className="text-white font-mono">{solicitud.cbu}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">🏛️ Banco</p>
                      <p className="text-white">{solicitud.bank_name || 'No especificado'}</p>
                    </div>
                  </div>

                  {solicitud.status === 'processed' && (
                    <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-4">
                      <p className="text-green-400 text-sm mb-1">✅ Procesado por</p>
                      <p className="text-white">{solicitud.processor_username || `Usuario #${solicitud.processor_id}`}</p>
                      <p className="text-gray-400 text-xs mt-1">{formatDate(solicitud.processed_at)}</p>
                      {solicitud.transfer_receipt && (
                        <p className="text-gray-300 text-sm mt-2">📄 Comprobante: {solicitud.transfer_receipt}</p>
                      )}
                    </div>
                  )}

                  {solicitud.status === 'rejected' && (
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
                      <p className="text-red-400 text-sm mb-1">❌ Rechazado</p>
                      <p className="text-white">{solicitud.rejection_reason}</p>
                      <p className="text-gray-400 text-xs mt-1">Por: {solicitud.processor_username || `Usuario #${solicitud.processor_id}`}</p>
                    </div>
                  )}

                  {/* Solo SuperAdmin puede procesar/rechazar */}
                  {solicitud.status === 'pending' && isSuperAdmin && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => openModal('process', solicitud)}
                        className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                      >
                        ✅ Procesar Retiro
                      </button>
                      <button
                        onClick={() => openModal('reject', solicitud)}
                        className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        ❌ Rechazar
                      </button>
                    </div>
                  )}

                  {/* Mensaje para agentes */}
                  {solicitud.status === 'pending' && !isSuperAdmin && (
                    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mt-4">
                      <p className="text-yellow-400 text-sm">⏳ Pendiente de aprobación por Andy</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de Acción */}
      {modalAction.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              {modalAction.type === 'process' ? '✅ Procesar Retiro' : '❌ Rechazar Solicitud'}
            </h3>

            <div className="mb-4 bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Usuario</p>
              <p className="text-white font-medium">{modalAction.solicitud?.username}</p>
              <p className="text-gray-400 text-sm mt-2">Monto</p>
              <p className="text-emerald-400 text-2xl font-bold">{formatMoney(modalAction.solicitud?.amount || 0)}</p>
            </div>

            {modalAction.type === 'process' ? (
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">📄 Comprobante de Transferencia</label>
                <input
                  type="text"
                  placeholder="Número de comprobante o referencia"
                  value={actionData.transferReceipt}
                  onChange={(e) => setActionData({ ...actionData, transferReceipt: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">📝 Motivo del Rechazo</label>
                <textarea
                  placeholder="Explique el motivo del rechazo"
                  value={actionData.rejectionReason}
                  onChange={(e) => setActionData({ ...actionData, rejectionReason: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={modalAction.type === 'process' ? handleProcessWithdrawal : handleRejectWithdrawal}
                disabled={actionLoading}
                className={`flex-1 px-6 py-3 ${
                  modalAction.type === 'process' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white rounded-lg font-medium transition-colors disabled:opacity-50`}
              >
                {actionLoading ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
