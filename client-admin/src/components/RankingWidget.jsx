/**
 * RankingWidget Component - "Club 24K"
 * Widget de top vendedores de la semana para el panel admin
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function RankingWidget() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
    const interval = setInterval(fetchRanking, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchRanking = async () => {
    try {
      const response = await axios.get('/api/gamification/ranking/weekly', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setRanking(response.data.ranking);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ranking:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="bg-slate-700 rounded-lg p-4 animate-pulse h-40" />;
  }

  const badges = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      {/* Encabezado */}
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <span>🏆 Top Vendedores de la Semana</span>
      </h2>

      {/* Top 3 - Zona Oro */}
      <div className="space-y-3 mb-6">
        {ranking.slice(0, 3).map((agent, idx) => (
          <div
            key={agent.agentId}
            className={`p-4 rounded-lg border-2 ${
              idx === 0
                ? 'bg-yellow-900 border-yellow-600'
                : idx === 1
                ? 'bg-gray-800 border-gray-600'
                : 'bg-amber-900 border-amber-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{badges[idx + 1]}</span>
                <div>
                  <p className="font-bold text-white">#{idx + 1} - {agent.username}</p>
                  <p className="text-sm text-gray-300">
                    {agent.cardsSold} cartones • ${agent.revenue.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-300">
                  +{agent.bonusAwarded.toLocaleString()} fichas
                </p>
                <p className="text-xs text-gray-400">Premio</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resto de agentes */}
      {ranking.length > 3 && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <p className="text-sm text-gray-400 mb-3">Otros agentes:</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {ranking.slice(3).map((agent) => (
              <div
                key={agent.agentId}
                className={`p-2 rounded border ${
                  agent.zone === 'descenso'
                    ? 'bg-red-900 bg-opacity-20 border-red-600'
                    : 'bg-slate-700 border-slate-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-white">#{agent.position} - {agent.username}</span>
                  <span className="text-xs text-gray-400">
                    {agent.cardsSold} cards • ${agent.revenue.toLocaleString()}
                  </span>
                </div>
                {agent.zone === 'descenso' && (
                  <p className="text-xs text-red-400 mt-1">⚠️ Zona de Descenso</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información general */}
      <div className="mt-6 pt-6 border-t border-slate-700 text-sm text-gray-400">
        <p>Total de agentes: {ranking.length}</p>
        <p className="text-xs mt-2">Se actualiza cada lunes a las 00:00</p>
      </div>
    </div>
  );
}
