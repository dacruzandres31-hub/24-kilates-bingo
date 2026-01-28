/**
 * MissionsPanel Component - "Club 24K"
 * Panel de misiones diarias con progreso y recompensas
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function MissionsPanel() {
  const [quests, setQuests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState({});

  useEffect(() => {
    fetchQuests();
    fetchStats();
    const interval = setInterval(() => {
      fetchQuests();
      fetchStats();
    }, 10000); // Actualizar cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchQuests = async () => {
    try {
      const response = await axios.get('/api/gamification/quests', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}` }
      });
      setQuests(response.data.quests);
      // Marcar completadas
      const comp = {};
      response.data.quests.forEach(q => {
        if (q.isCompleted) comp[q.questId] = true;
      });
      setCompleted(comp);
    } catch (error) {
      console.error('Error fetching quests:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/gamification/quest-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}` }
      });
      setStats(response.data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="bg-slate-700 rounded-lg p-4 animate-pulse h-40" />;
  }

  const getRewardIcon = (type) => {
    switch (type) {
      case 'credits':
        return '💰';
      case 'xp_multiplier':
        return '⚡';
      case 'free_card':
        return '🎫';
      default:
        return '🎁';
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">📋 Misiones de Hoy</h3>
        {stats && (
          <div className="text-sm text-gray-300">
            {stats.completed}/{stats.total} completadas
          </div>
        )}
      </div>

      {/* Barra de progreso general */}
      {stats && (
        <div className="mb-4">
          <div className="bg-slate-700 rounded-full h-3 overflow-hidden border border-slate-600">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${stats.completionPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {stats.completionPercent}% completado
          </p>
        </div>
      )}

      {/* Lista de misiones */}
      <div className="space-y-3">
        {quests.length === 0 ? (
          <p className="text-gray-400 text-sm">Cargando misiones...</p>
        ) : (
          quests.map((quest) => (
            <div
              key={quest.questId}
              className={`p-3 rounded border ${
                completed[quest.questId]
                  ? 'bg-green-900 border-green-600'
                  : 'bg-slate-700 border-slate-600'
              }`}
            >
              {/* Nombre y estado */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>{completed[quest.questId] ? '✅' : '⬜'}</span>
                    <span className="font-semibold text-white">{quest.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{quest.description}</p>
                </div>
                <span className="text-lg">
                  {getRewardIcon(quest.rewardType)}
                </span>
              </div>

              {/* Progreso */}
              <div className="mb-2">
                <div className="bg-slate-600 rounded-full h-2 overflow-hidden border border-slate-500">
                  <div
                    className={`h-full transition-all duration-300 ${
                      completed[quest.questId] ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${quest.progress.percent}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {quest.progress.current}/{quest.progress.target}
                </p>
              </div>

              {/* Recompensa */}
              <div className="text-sm text-amber-300 font-semibold">
                {quest.rewardType === 'credits' && `Recompensa: +${quest.rewardAmount} 💳`}
                {quest.rewardType === 'xp_multiplier' && `Recompensa: XP x${quest.rewardAmount} por 24hs ⚡`}
                {completed[quest.questId] && ' ✓ COMPLETADA'}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Información general */}
      {stats && stats.creditsEarned > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-sm text-green-400">
            💰 Créditos ganados hoy: +{stats.creditsEarned}
          </p>
        </div>
      )}
    </div>
  );
}
