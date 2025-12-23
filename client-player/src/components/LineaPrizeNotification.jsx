// ============================================
// COMPONENTE: NOTIFICACIÓN DE LÍNEA
// ============================================
// Modal simple que avisa al jugador que ganó una línea
// Sin formulario, solo notificación y cierre

import BingoCard from './BingoCard'; // Import BingoCard

export default function LineaPrizeNotification({ isOpen, onClose, prizeAmount, winningCard }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4">
      <div className="flex flex-col items-center animate-bounce-slow max-w-4xl w-full">

        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
          <h2 className="relative text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] animate-pulse">
            ¡LÍNEA GANADA!
          </h2>
          <p className="relative text-3xl text-white font-bold mt-2 drop-shadow-md">
            Premio: <span className="text-green-400">${prizeAmount.toLocaleString('es-AR')}</span>
          </p>
        </div>

        {/* Winning Card - Scaled Up */}
        {winningCard && (
          <div className="transform scale-150 transition-all duration-500 hover:scale-[1.6] my-10 shadow-[0_0_50px_rgba(59,130,246,0.6)] rounded-xl bg-slate-800 border-4 border-yellow-400">
            <div className="pointer-events-none">
              <BingoCard
                gridNumbers={winningCard.gridNumbers}
                markedNumbers={winningCard.markedNumbers || new Set()} // Need to pass marked numbers
                showNumbers={true}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="mt-8 px-12 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-full font-black text-2xl transition-all transform hover:scale-110 shadow-[0_0_30px_rgba(6,182,212,0.6)]"
        >
          CONTINUAR JUGANDO ▶
        </button>

      </div>
    </div>
  );
}
