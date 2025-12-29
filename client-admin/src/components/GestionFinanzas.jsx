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
import ReporteIngresos from './ReporteIngresos';
import RentabilidadPanel from './RentabilidadPanel';
import DepositInbox from './DepositInbox';
import PaymentAccountsPanel from './PaymentAccountsPanel';

export default function GestionFinanzas({ userData }) {
  const [activeTab, setActiveTab] = useState('depositos');

  const tabs = [
    { id: 'depositos', name: '📥 Depósitos (Inbox)', icon: '📥' },
    { id: 'retiros', name: '🏦 Retiros', icon: '🏦', superAdminOnly: true },
    { id: 'rentabilidad', name: '📈 Rentabilidad (GGR)', icon: '📈', superAdminOnly: true },
    { id: 'movimientos', name: '💵 Movimientos', icon: '💵' },
    { id: 'cuentas', name: '💳 Cuentas Bancarias', icon: '💳' },
    { id: 'reportes', name: '📊 Reportes', icon: '📊' }
  ];

  // Filtrar tabs según permisos del usuario
  const filteredTabs = tabs.filter(tab =>
    !tab.superAdminOnly || userData?.username === 'Andy'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-white mb-2">💰 Gestión de Finanzas</h2>
        <p className="text-emerald-100">Control completo de ingresos, egresos y auditoría</p>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-700 overflow-x-auto">
          {filteredTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[150px] px-6 py-4 text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
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
          {activeTab === 'depositos' && <DepositInbox />}
          {activeTab === 'cuentas' && <PaymentAccountsPanel />}
          {activeTab === 'rentabilidad' && <RentabilidadPanel />}
          {activeTab === 'movimientos' && <MovimientosChips />}
          {activeTab === 'retiros' && <SolicitudesRetiro userData={userData} />}
          {activeTab === 'reportes' && <ReporteIngresos />}
        </div>
      </div>
    </div>
  );
}
