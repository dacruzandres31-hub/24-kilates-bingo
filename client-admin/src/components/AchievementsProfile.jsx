/**
 * AchievementsProfile Component - "Club 24K"
 * Perfil de agente con medallas de logros desbloqueadas
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AchievementsProfile({ agentId }) {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, [agentId]);

  const fetchAchievements = async () => {
    try {
      const [achievRes, statsRes] = await Promise.all([
        axios.get(`/api/gamification/agent/${agentId}/achievements`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`/api/gamification/agent/${agentId}/stats`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setAchievements(achievRes.data.achievements);
      setStats(statsRes.data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="bg-slate-700 rounded-lg p-4 animate-pulse h-40" />;
  }

  const achievementDetails = {
    recruiter_master: {
      icon: '🏅',
      bonus: 'Descuento en fichas: 5%',
      description: '10 Sub-Agentes activos'
    },
    whale_hunter: {
      icon: '🐋',
      bonus: '5,000 fichas (bono único)',
      description: 'Jugador con $100k+ gasto mensual'
    },
    night_seller: {
      icon: '🌙',
      bonus: 'Reconocimiento',
      description: '500+ cartones en Oro (22hs)'
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      {/* Encabezado */}
      <h2 className="text-2xl font-bold text-white mb-6">🏆 Logros Desbloqueados</h2>

      {/* Estadísticas generales */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-700 rounded p-4">
            <p className="text-gray-400 text-sm">Total Logros</p>
            <p className="text-3xl font-bold text-cyan-400">{stats.achievementCount || 0}</p>
          </div>
          {stats.weeklyStats && (
            <>
              <div className="bg-slate-700 rounded p-4">
                <p className="text-gray-400 text-sm">Venta Semanal</p>
                <p className="text-3xl font-bold text-amber-400">#{stats.weeklyStats.ranking || '-'}</p>
              </div>
              <div className="bg-slate-700 rounded p-4">
                <p className="text-gray-400 text-sm">Ingresos</p>
                <p className="text-3xl font-bold text-green-400">
                  ${(stats.weeklyStats.revenue || 0).toLocaleString()}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Logros */}
      {achievements.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-lg">Sin logros desbloqueados aún</p>
          <p className="text-gray-500 text-sm mt-2">Sigue cumpliendo objetivos para desbloquear medallas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((ach) => {
            const details = achievementDetails[ach.type] || {};
            return (
              <div
                key={ach.type}
                className="bg-gradient-to-br from-amber-900 to-amber-800 rounded-lg p-4 border border-amber-700 hover:border-amber-500 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-3xl mb-2">{details.icon || '⭐'}</p>
                    <h4 className="text-lg font-bold text-white">{ach.name}</h4>
                    <p className="text-sm text-amber-200 mt-1">{ach.description}</p>
                  </div>
                </div>

                {/* Bonificación */}
                <div className="bg-black bg-opacity-30 rounded p-3 mt-4">
                  <p className="text-xs text-gray-400">Bonificación:</p>
                  <p className="font-semibold text-amber-300">{details.bonus}</p>
                </div>

                {/* Fecha desbloqueo */}
                <p className="text-xs text-gray-500 mt-3">
                  Desbloqueado: {new Date(ach.unlockedAt).toLocaleDateString('es-AR')}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Próximos objetivos (info) */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <p className="text-sm text-gray-400 font-semibold mb-3">📌 Próximos objetivos:</p>
        <ul className="text-sm text-gray-400 space-y-2">
          <li>• Reclutador Maestro: 10 Sub-Agentes activos</li>
          <li>• Ballena Hunter: Jugador con $100k+ gasto</li>
          <li>• Vendedor Nocturno: 500+ cartones en Oro</li>
        </ul>
      </div>
    </div>
  );
}
