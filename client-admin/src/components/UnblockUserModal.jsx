import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Unlock } from 'lucide-react';

export default function UnblockUserModal({ isOpen, user, onClose, onConfirm }) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !user) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm();
    setIsProcessing(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-green-500/50 w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Unlock className="w-6 h-6" />
            Desbloquear Usuario
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-green-300 transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {/* Usuario a desbloquear */}
          <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400 mb-1">Usuario:</p>
            <p className="text-xl font-bold text-white mb-3">{user.username}</p>
            <p className="text-sm text-gray-400 mb-1">Motivo del bloqueo:</p>
            <p className="text-sm text-red-400 italic bg-red-900/20 p-2 rounded">
              "{user.block_reason || 'Sin motivo especificado'}"
            </p>
          </div>

          {/* Pregunta de confirmación */}
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6">
            <p className="text-white text-center font-semibold">
              ¿Desbloquear a <span className="text-green-400">{user.username}</span>?
            </p>
            <p className="text-sm text-gray-400 text-center mt-2">
              El usuario podrá acceder nuevamente al sistema
            </p>
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
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`flex-1 py-3 text-white font-bold rounded-xl transition-all ${
                isProcessing
                  ? 'opacity-50 cursor-not-allowed bg-gray-600'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
              }`}
            >
              {isProcessing ? '⏳ DESBLOQUEANDO...' : '🔓 DESBLOQUEAR'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
