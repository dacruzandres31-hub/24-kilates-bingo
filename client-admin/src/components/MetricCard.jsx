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
      <div className="metric-card">
        <div className="flex items-center justify-between mb-4">
          <div className="loading-skeleton h-5 w-32"></div>
          <div className="loading-skeleton h-10 w-10 rounded-full"></div>
        </div>
        <div className="loading-skeleton h-9 w-40 mb-2"></div>
        <div className="loading-skeleton h-4 w-24"></div>
      </div>
    );
  }

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          {title}
        </h3>
        {icon && (
          <div className={`p-2 rounded-full ${iconBgClasses[type]}`}>
            <span className="text-2xl">{icon}</span>
          </div>
        )}
      </div>

      <div className={`stat-value ${typeClasses[type]} mb-2`}>
        {typeof value === 'number' ? formatMoney(value) : value}
      </div>

      {subtitle && (
        <p className="text-sm text-slate-400">{subtitle}</p>
      )}

      {trend && (
        <div className={`flex items-center gap-2 mt-2 text-sm ${trend.type === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          <span>{trend.type === 'up' ? '↗' : '↘'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
