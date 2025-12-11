import React from 'react';

export default function AlertsList({ alertas = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="loading-skeleton h-6 w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="loading-skeleton h-16"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!alertas || alertas.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="section-title">
          <span>🔔</span>
          <span>Alertas del Sistema</span>
        </h2>
        <div className="text-center py-8 text-slate-400">
          <span className="text-4xl mb-2 block">✅</span>
          <p>No hay alertas pendientes</p>
        </div>
      </div>
    );
  }

  const getAlertIcon = (tipo) => {
    const icons = {
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️',
      success: '✅'
    };
    return icons[tipo] || '📌';
  };

  const getAlertClass = (tipo) => {
    const classes = {
      warning: 'alert-warning border-l-4 border-l-yellow-500',
      error: 'alert-error border-l-4 border-l-red-500',
      info: 'alert-info border-l-4 border-l-blue-500'
    };
    return classes[tipo] || 'alert-info border-l-4 border-l-slate-500';
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h2 className="section-title">
        <span>🔔</span>
        <span>Alertas del Sistema</span>
        <span className="ml-auto text-sm font-normal text-slate-400">
          {alertas.length} pendiente{alertas.length !== 1 ? 's' : ''}
        </span>
      </h2>

      <div className="space-y-3">
        {alertas.map((alerta, index) => (
          <div 
            key={index}
            className={`${getAlertClass(alerta.tipo)} p-4 rounded-lg flex items-start gap-3 hover:scale-[1.01] transition-transform cursor-pointer`}
            onClick={() => alerta.accion && (window.location.href = alerta.accion)}
          >
            <span className="text-2xl flex-shrink-0">{getAlertIcon(alerta.tipo)}</span>
            <div className="flex-1">
              <p className="font-medium">{alerta.mensaje}</p>
              {alerta.accion && (
                <p className="text-xs mt-1 opacity-70">
                  Click para ir a {alerta.accion}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
