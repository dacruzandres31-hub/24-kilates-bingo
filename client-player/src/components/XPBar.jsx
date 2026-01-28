/**
 * XPBar Component - "Club 24K"
 * Barra de progreso de XP con nivel actual y próximo
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function XPBar() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 5000); // Actualizar cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await axios.get('/api/gamification/progress', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}` }
      });
      setProgress(response.data.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !progress) {
    return <div className="h-16 bg-slate-700 rounded-lg animate-pulse" />;
  }

  const colors = {
    1: 'bg-gray-500',
    2: 'bg-amber-600',
    3: 'bg-slate-400',
    4: 'bg-yellow-400',
    5: 'bg-blue-400'
  };

  const borderColors = {
    1: 'border-gray-400',
    2: 'border-amber-500',
    3: 'border-slate-300',
    4: 'border-yellow-300',
    5: 'border-cyan-300'
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${borderColors[progress.level] || borderColors[1]} ${colors[progress.level] || colors[1]} bg-opacity-20`}>
      {/* Encabezado con nivel y rango */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="text-sm text-gray-300">Nivel {progress.level}</span>
          <span className="text-xl font-bold text-white ml-2">{progress.rankName}</span>
        </div>
        <span className="text-xs text-gray-400">{progress.visualBenefit}</span>
      </div>

      {/* Barra de progreso */}
      <div className="bg-slate-800 rounded-full h-6 overflow-hidden border border-slate-600">
        <div
          className={`h-full rounded-full transition-all duration-300 flex items-center justify-center ${colors[progress.level] || colors[1]}`}
          style={{ width: `${progress.progressPercent}%` }}
        >
          {progress.progressPercent > 20 && (
            <span className="text-xs font-bold text-white">
              {progress.currentXP}/{progress.nextLevelXP}
            </span>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>XP Total: {progress.totalXPLifetime}</span>
        <span>{progress.progressPercent}% al próximo nivel</span>
      </div>

      {/* Logros desbloqueados */}
      {progress.achievements && progress.achievements.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-600">
          <p className="text-xs text-gray-300 mb-2">🏆 Logros:</p>
          <div className="flex flex-wrap gap-2">
            {progress.achievements.map((ach, idx) => (
              <span key={idx} className="text-xs bg-slate-700 px-2 py-1 rounded">
                {ach}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
