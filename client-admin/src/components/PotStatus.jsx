import React from 'react';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const getRoomColor = (room) => {
  const colors = {
    bronce: 'from-bronze-500 to-bronze-600',
    plata: 'from-silver-400 to-silver-600',
    oro: 'from-gold-500 to-gold-600',
    free_starter: 'from-green-500 to-green-600'
  };
  return colors[room] || 'from-slate-500 to-slate-600';
};

export default function PotStatus({ pozos, loading = false }) {
  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="loading-skeleton h-6 w-40 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="loading-skeleton h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h2 className="section-title">
        <span>💰</span>
        <span>Estado de Pozos</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total General */}
        <div className="col-span-full bg-gradient-to-br from-gold-500/20 to-gold-600/20 border border-gold-500/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gold-300 uppercase tracking-wide mb-2">
                💎 Total en Pozos
              </p>
              <p className="text-4xl font-bold text-gold-400">
                {formatMoney(pozos?.suma_total || 0)}
              </p>
            </div>
            <div className="text-6xl opacity-20">🏆</div>
          </div>
        </div>

        {/* Pozos LÍNEA */}
        <div className="bg-slate-900/50 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📏</span>
            <h3 className="text-lg font-semibold text-blue-400">Pozos LÍNEA</h3>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatMoney(pozos?.total_linea || 0)}
          </p>
        </div>

        {/* Pozos BINGO */}
        <div className="bg-slate-900/50 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-semibold text-green-400">Pozos BINGO</h3>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatMoney(pozos?.total_bingo || 0)}
          </p>
        </div>

        {/* Pozos Acumulativos */}
        <div className="bg-slate-900/50 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🔥</span>
            <h3 className="text-lg font-semibold text-purple-400">Acumulativos</h3>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatMoney(pozos?.total_acumulativo || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
