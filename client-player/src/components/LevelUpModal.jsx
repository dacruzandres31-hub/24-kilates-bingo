/**
 * LevelUpModal Component - "Club 24K"
 * Modal festivo cuando el jugador sube de nivel
 */

import React, { useState, useEffect } from 'react';

export default function LevelUpModal({ isOpen, level, rewards, onClose }) {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rankNames = {
    1: 'Novato',
    2: 'Cobre',
    3: 'Plata Fina',
    4: 'Oro Puro',
    5: 'Diamante 24K'
  };

  const colors = {
    1: 'from-gray-600 to-gray-400',
    2: 'from-amber-700 to-amber-500',
    3: 'from-slate-500 to-slate-300',
    4: 'from-yellow-600 to-yellow-400',
    5: 'from-cyan-600 to-cyan-400'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div
        className={`transform transition-all duration-500 ${
          animating ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      >
        <div className={`bg-gradient-to-b ${colors[level]} rounded-xl p-8 shadow-2xl max-w-sm mx-auto text-center`}>
          {/* Confeti visual */}
          <div className="mb-4 text-4xl animate-bounce">
            🎉 ✨ 🎊
          </div>

          {/* Título */}
          <h2 className="text-3xl font-bold text-white mb-2">
            ¡LEVEL UP!
          </h2>

          {/* Nivel */}
          <div className="text-6xl font-bold text-white mb-4">
            Nivel {level}
          </div>

          {/* Nombre del rango */}
          <h3 className="text-2xl font-bold text-white mb-6">
            {rankNames[level] || 'Nuevo Nivel'}
          </h3>

          {/* Recompensas */}
          {rewards && (
            <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-6">
              <p className="text-white font-semibold mb-3">Recompensas desbloqueadas:</p>
              
              {rewards.creditReward > 0 && (
                <div className="flex items-center justify-center gap-2 mb-2 text-white">
                  <span className="text-2xl">💰</span>
                  <span className="font-bold">+${rewards.creditReward.toLocaleString()} Créditos</span>
                </div>
              )}

              {rewards.freeCardReward > 0 && (
                <div className="flex items-center justify-center gap-2 mb-2 text-white">
                  <span className="text-2xl">🎫</span>
                  <span className="font-bold">+{rewards.freeCardReward} Cartón Gratis</span>
                </div>
              )}

              {rewards.exclusiveAccess && (
                <div className="flex items-center justify-center gap-2 text-white">
                  <span className="text-2xl">🏆</span>
                  <span className="font-bold">Acceso a Sorteos Exclusivos</span>
                </div>
              )}
            </div>
          )}

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="bg-white text-black px-8 py-2 rounded-lg font-bold hover:bg-gray-100 transition-all"
          >
            ¡Continuar Jugando!
          </button>
        </div>
      </div>
    </div>
  );
}
