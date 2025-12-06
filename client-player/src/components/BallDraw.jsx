import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * BallDraw Component - Visualizador de Bolillero
 * Muestra números sorteados en tiempo real con animación
 */

export default function BallDraw({ drawnNumbers = [], latestNumber = null, totalDrawn = 0 }) {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [animate, setAnimate] = useState(false);

  // Efecto de animación cuando se dibuja un nuevo número
  useEffect(() => {
    if (latestNumber) {
      setAnimate(true);
      // Reproducir sonido si está habilitado
      if (isSoundEnabled) {
        playDrawSound();
      }
      const timer = setTimeout(() => setAnimate(false), 600);
      return () => clearTimeout(timer);
    }
  }, [latestNumber, isSoundEnabled]);

  // Reproducir sonido de bolilla sorteada
  const playDrawSound = () => {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.1);
    } catch (error) {
      console.log('No audio support');
    }
  };

  // Divir números en grupos para visualización tipo bolillero
  const groupNumbers = (numbers) => {
    const groups = {
      B: [], // 1-15
      I: [], // 16-30
      N: [], // 31-45
      G: [], // 46-60
      O: []  // 61-75
    };

    for (const num of numbers) {
      if (num >= 1 && num <= 15) groups.B.push(num);
      else if (num >= 16 && num <= 30) groups.I.push(num);
      else if (num >= 31 && num <= 45) groups.N.push(num);
      else if (num >= 46 && num <= 60) groups.G.push(num);
      else if (num >= 61 && num <= 75) groups.O.push(num);
    }

    return groups;
  };

  const groupedNumbers = groupNumbers(drawnNumbers);
  const columns = ['B', 'I', 'N', 'G', 'O'];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-cyan-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-cyan-400">🎰 BOLILLERO</h2>
          <p className="text-slate-400 mt-1">Números sorteados: {totalDrawn}</p>
        </div>
        
        {/* Latest Number Display */}
        {latestNumber && (
          <div className={`
            text-center px-6 py-4 rounded-xl border-2 border-yellow-400
            transform transition-all duration-300
            ${animate ? 'scale-110 bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400' : 'bg-slate-700 text-yellow-400'}
          `}>
            <p className="text-sm text-slate-400 mb-1">ÚLTIMA BOLILLA</p>
            <p className="text-5xl font-bold">{latestNumber}</p>
          </div>
        )}

        {/* Sound Toggle */}
        <button
          onClick={() => setIsSoundEnabled(!isSoundEnabled)}
          className={`
            p-3 rounded-lg transition-all
            ${isSoundEnabled 
              ? 'bg-cyan-500 text-slate-900 hover:bg-cyan-400' 
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }
          `}
          title={isSoundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
        >
          {isSoundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </div>

      {/* Ball Grid - BINGO Style */}
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {columns.map((col) => (
            <div key={col} className="space-y-2">
              {/* Column Header */}
              <div className="text-center py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg">
                <p className="text-white font-bold text-2xl">{col}</p>
              </div>

              {/* Numbers in Column */}
              <div className="space-y-1 min-h-96 overflow-y-auto bg-slate-950 rounded-lg p-2">
                {groupedNumbers[col].length > 0 ? (
                  groupedNumbers[col]
                    .sort((a, b) => a - b)
                    .map((num) => (
                      <div
                        key={num}
                        className={`
                          p-2 rounded-lg text-center font-bold text-lg transition-all
                          ${num === latestNumber 
                            ? 'bg-yellow-400 text-slate-900 scale-105 ring-2 ring-yellow-300' 
                            : 'bg-slate-700 text-white'
                          }
                        `}
                      >
                        {num}
                      </div>
                    ))
                ) : (
                  <div className="text-slate-600 text-center text-sm py-4">
                    Sin números
                  </div>
                )}
              </div>

              {/* Count */}
              <div className="text-center text-slate-400 text-xs">
                {groupedNumbers[col].length} números
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-slate-700 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-sm">Total Sorteados</p>
          <p className="text-3xl font-bold text-cyan-400 mt-1">{totalDrawn}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-sm">Números Disponibles</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{75 - totalDrawn}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-sm">Probabilidad Sonada</p>
          <p className="text-3xl font-bold text-orange-400 mt-1">{((totalDrawn / 75) * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="mt-6">
        <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border-2 border-slate-700">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500"
            style={{ width: `${(totalDrawn / 75) * 100}%` }}
          />
        </div>
        <p className="text-slate-400 text-xs mt-2">
          {totalDrawn}/75 números sorteados
        </p>
      </div>
    </div>
  );
}
