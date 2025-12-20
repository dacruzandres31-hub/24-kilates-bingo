// ============================================
// COMPONENTE: NOTIFICACIÓN DE LÍNEA
// ============================================
// Modal simple que avisa al jugador que ganó una línea
// Sin formulario, solo notificación y cierre

export default function LineaPrizeNotification({ isOpen, onClose, prizeAmount }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl shadow-2xl border-4 border-blue-400 max-w-md w-full animate-bounce-slow">
        {/* Header */}
        <div className="p-8 text-center">
          <div className="text-8xl mb-4 animate-pulse">📊</div>
          <h2 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            ¡LÍNEA!
          </h2>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-8 py-4 inline-block mb-6">
            <p className="text-blue-100 text-sm mb-1">Has ganado</p>
            <p className="text-6xl font-bold text-white drop-shadow-lg">
              ${prizeAmount.toLocaleString('es-AR')}
            </p>
          </div>

          <p className="text-blue-100 text-lg mb-8">
            ¡Felicitaciones! El premio ha sido acreditado a tu balance.
          </p>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="w-full px-8 py-4 bg-white hover:bg-blue-50 text-blue-900 rounded-xl font-bold text-xl transition-all transform hover:scale-105 shadow-lg"
          >
            ¡Genial! 🎉
          </button>
        </div>
      </div>
    </div>
  );
}
