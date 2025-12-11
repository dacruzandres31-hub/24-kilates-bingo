import React from 'react';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function MetricCard({ title, value, subtitle, icon, type = 'neutral', trend, loading = false }) {
  const typeClasses = {
    positive: 'stat-positive',
    warning: 'stat-warning',
    danger: 'stat-danger',
    info: 'stat-info',
    neutral: 'stat-neutral'
  };

  const iconBgClasses = {
    positive: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
    neutral: 'bg-slate-600/20 text-slate-400'
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-10 w-10 bg-gray-700 rounded-lg animate-pulse"></div>
        </div>
        <div className="h-9 w-40 bg-gray-700 rounded animate-pulse mb-2"></div>
        <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg hover:shadow-xl transition-all hover:border-gray-600/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
        {icon && (
          <div className={`p-2.5 rounded-lg ${iconBgClasses[type]} backdrop-blur-sm`}>
            <span className="text-xl">{icon}</span>
          </div>
        )}
      </div>

      <div className={`text-3xl font-bold mb-2 ${
        type === 'positive' ? 'text-green-400' :
        type === 'warning' ? 'text-yellow-400' :
        type === 'danger' ? 'text-red-400' :
        type === 'info' ? 'text-blue-400' :
        'text-white'
      }`}>
        {typeof value === 'number' ? formatMoney(value) : value}
      </div>

      {subtitle && (
        <p className="text-sm text-gray-400 font-medium">{subtitle}</p>
      )}

      {trend && (
        <div className={`flex items-center gap-2 mt-3 text-sm font-semibold ${trend.type === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          <span className="text-lg">{trend.type === 'up' ? '↗' : '↘'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
