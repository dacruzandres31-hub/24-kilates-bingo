import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock } from 'lucide-react';

export default function BlockUserModal({ isOpen, user, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Debe ingresar un motivo para el bloqueo');
      return;
    }

    setIsProcessing(true);
    await onConfirm(reason.trim());
    setIsProcessing(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-red-500/50 w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6" />
            Bloquear Usuario
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-red-300 transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Usuario a bloquear */}
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400 mb-1">Usuario a bloquear:</p>
            <p className="text-xl font-bold text-white">{user.username}</p>
            <p className="text-sm text-gray-400 mt-1">
              Rol: <span className="text-red-400 font-semibold">{user.role === 'agente' ? 'Agente' : 'Jugador'}</span>
            </p>
          </div>

          {/* Advertencia */}
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-400 flex items-center gap-2">
              <span>⚠️</span>
              <span>El usuario no podrá acceder al sistema hasta que sea desbloqueado</span>
            </p>
          </div>

          {/* Motivo del bloqueo */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Motivo del bloqueo: <span className="text-red-400">*</span>
            </label>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ingrese el motivo del bloqueo..."
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 focus:outline-none focus:border-red-500 text-white placeholder-gray-400 rounded-lg transition-colors resize-none"
              rows="4"
              required
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-xl transition-all"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={isProcessing || !reason.trim()}
              className={`flex-1 py-3 text-white font-bold rounded-xl transition-all ${
                isProcessing || !reason.trim()
                  ? 'opacity-50 cursor-not-allowed bg-gray-600'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
              }`}
            >
              {isProcessing ? '⏳ BLOQUEANDO...' : '🔒 BLOQUEAR'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
