// ============================================
// COMPONENTE: GESTIÓN DE FINANZAS
// ============================================
// Panel principal de finanzas con tabs para:
// - Movimientos de Chips
// - Solicitudes de Retiro
// - Comisiones de Cajeros
// - Reportes de Ingresos

import { useState } from 'react';
import MovimientosChips from './MovimientosChips';
import SolicitudesRetiro from './SolicitudesRetiro';
import ComisionesPanel from './ComisionesPanel';
import ReporteIngresos from './ReporteIngresos';

export default function GestionFinanzas() {
  const [activeTab, setActiveTab] = useState('movimientos');

  const tabs = [
    { id: 'movimientos', name: '💵 Movimientos', icon: '💵' },
    { id: 'retiros', name: '🏦 Retiros', icon: '🏦' },
    { id: 'comisiones', name: '💰 Comisiones', icon: '💰' },
    { id: 'reportes', name: '📊 Reportes', icon: '📊' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-white mb-2">💰 Gestión de Finanzas</h2>
        <p className="text-emerald-100">Control completo de movimientos, retiros, comisiones y reportes financieros</p>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="text-lg mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'movimientos' && <MovimientosChips />}
          {activeTab === 'retiros' && <SolicitudesRetiro />}
          {activeTab === 'comisiones' && <ComisionesPanel />}
          {activeTab === 'reportes' && <ReporteIngresos />}
        </div>
      </div>
    </div>
  );
}
