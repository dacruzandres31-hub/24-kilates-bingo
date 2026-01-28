// ============================================
// COMPONENTE: MODAL DE RECLAMO DE PREMIO
// ============================================
// Modal para que el jugador complete sus datos bancarios
// cuando gana LÍNEA, BINGO o POZO ACUMULADO

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function PrizeClaimModal({
  isOpen,
  onClose,
  prizeType, // 'LINEA', 'BINGO', 'POZO'
  prizeAmount,
  sessionId,
  userBalance // Balance actual del usuario
}) {
  const [formData, setFormData] = useState({
    withdrawalAmount: prizeAmount, // Monto a retirar (puede ser menor que el premio)
    bankAccountHolder: '',
    cbu: '',
    bankName: '',
    accountType: 'savings' // 'savings' o 'checking'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Resetear monto cuando cambia el premio
  useEffect(() => {
    if (isOpen && prizeAmount) {
      setFormData(prev => ({
        ...prev,
        withdrawalAmount: prizeAmount
      }));
    }
  }, [isOpen, prizeAmount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.withdrawalAmount || formData.withdrawalAmount <= 0) {
      setError('El monto a retirar debe ser mayor a 0');
      return;
    }

    if (formData.withdrawalAmount > prizeAmount) {
      setError(`El monto a retirar no puede superar el premio ($${prizeAmount.toLocaleString()})`);
      return;
    }

    if (!formData.bankAccountHolder.trim()) {
      setError('El titular de la cuenta es requerido');
      return;
    }

    if (!formData.cbu.trim()) {
      setError('El CBU es requerido');
      return;
    }

    if (formData.cbu.length !== 22) {
      setError('El CBU debe tener 22 dígitos');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');

      const { data } = await axios.post(
        `${API_URL}/api/withdrawals/request`,
        {
          amount: formData.withdrawalAmount,
          bankAccountHolder: formData.bankAccountHolder,
          cbu: formData.cbu,
          bankName: formData.bankName,
          accountType: formData.accountType
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          // Reset form
          setFormData({
            withdrawalAmount: prizeAmount,
            bankAccountHolder: '',
            cbu: '',
            bankName: '',
            accountType: 'savings'
          });
          setSuccess(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Error creando solicitud de retiro:', err);
      setError(err.response?.data?.message || 'Error al crear solicitud de retiro');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const prizeEmoji = {
    LINEA: '📊',
    BINGO: '🎉',
    POZO: '💰'
  };

  const prizeColor = {
    LINEA: 'text-blue-400',
    BINGO: 'text-yellow-400',
    POZO: 'text-green-400'
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border-2 border-yellow-500 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6 rounded-t-2xl">
          <div className="text-center">
            <div className="text-6xl mb-3">{prizeEmoji[prizeType]}</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              ¡{prizeType === 'LINEA' ? 'LÍNEA!' : prizeType}!
            </h2>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 inline-block">
              <p className="text-yellow-100 text-sm mb-1">Premio</p>
              <p className="text-4xl font-bold text-white">
                ${prizeAmount.toLocaleString('es-AR')}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {!success ? (
            <>
              <p className="text-gray-300 text-center mb-6">
                Complete sus datos bancarios para procesar el retiro de su premio
              </p>

              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Monto a retirar */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Monto a retirar *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={prizeAmount}
                      value={formData.withdrawalAmount}
                      onChange={(e) => setFormData({ ...formData, withdrawalAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-lg font-semibold"
                      required
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-gray-500">
                      Premio total: ${prizeAmount.toLocaleString('es-AR')}
                    </span>
                    <span className="text-emerald-400">
                      Para cartones: ${(prizeAmount - (formData.withdrawalAmount || 0)).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, withdrawalAmount: prizeAmount * 0.5 })}
                      className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, withdrawalAmount: prizeAmount * 0.75 })}
                      className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                    >
                      75%
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, withdrawalAmount: prizeAmount })}
                      className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                    >
                      100%
                    </button>
                  </div>
                </div>

                {/* Titular de la cuenta */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Titular de la cuenta *
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountHolder}
                    onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                    placeholder="Nombre completo del titular"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                    required
                  />
                </div>

                {/* CBU */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    CBU (22 dígitos) *
                  </label>
                  <input
                    type="text"
                    value={formData.cbu}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 22);
                      setFormData({ ...formData, cbu: value });
                    }}
                    placeholder="0000000000000000000000"
                    maxLength={22}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 font-mono"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.cbu.length}/22 dígitos
                  </p>
                </div>

                {/* Banco */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="Ej: Banco Nación"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>

                {/* Tipo de cuenta */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Tipo de cuenta
                  </label>
                  <select
                    value={formData.accountType}
                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value="savings">Caja de Ahorro</option>
                    <option value="checking">Cuenta Corriente</option>
                  </select>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? '⏳ Enviando...' : '✅ Solicitar Retiro'}
                  </button>
                </div>
              </form>

              <p className="text-xs text-gray-500 text-center mt-4">
                Su solicitud será revisada por 24Kilates en breve
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h3>
              <p className="text-gray-300">
                Su solicitud de retiro ha sido creada exitosamente.
                <br />
                24Kilates la procesará pronto.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
