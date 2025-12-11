import { useState, useEffect } from 'react';
import axios from 'axios';
import MetricCard from '../components/MetricCard';
import PotStatus from '../components/PotStatus';
import AlertsList from '../components/AlertsList';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSections, setActiveSections] = useState({
    'finanzas-hoy': true,
    'finanzas-historico': false,
    'finanzas-graficos': false,
    'usuarios': false,
    'sesiones-activas': false,
    'sesiones-pozos': false,
    'sistema': false
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const [userRes, finRes] = await Promise.all([
        axios.get('/api/admin/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/financial-summary', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setUserData(userRes.data);
      setFinancialData(finRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  const handleToggleSection = (sectionId) => {
    setActiveSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Sidebar */}
      <Sidebar 
        activeSections={activeSections}
        onToggleSection={handleToggleSection}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/logo.png" alt="Bingo 24K" className="h-12" />
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600">
                  Panel de Administración
                </h1>
                <p className="text-gray-400 text-sm">
                  Bienvenido, {userData?.username || 'Admin'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                🔄
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
          {/* Finanzas - Resumen de Hoy */}
          {activeSections['finanzas-hoy'] && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">💰 Finanzas - Resumen de Hoy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Ventas del Día"
                  value={formatMoney(financialData?.today?.sales || 0)}
                  type="positive"
                  icon="💵"
                />
                <MetricCard
                  title="Premios Pagados"
                  value={formatMoney(financialData?.today?.prizesDistributed || 0)}
                  type="warning"
                  icon="🏆"
                />
                <MetricCard
                  title="Balance Neto"
                  value={formatMoney(financialData?.today?.netBalance || 0)}
                  type={financialData?.today?.netBalance >= 0 ? 'positive' : 'danger'}
                  icon="📊"
                />
                <MetricCard
                  title="Usuarios Activos"
                  value={financialData?.today?.activeUsers || 0}
                  type="info"
                  icon="👥"
                />
              </div>
            </section>
          )}

          {/* Finanzas - Histórico */}
          {activeSections['finanzas-historico'] && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">📈 Finanzas - Histórico</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Ventas - 7 Días"
                  value={formatMoney(financialData?.week?.sales || 0)}
                  type="info"
                  icon="📅"
                />
                <MetricCard
                  title="Ventas - 30 Días"
                  value={formatMoney(financialData?.month?.sales || 0)}
                  type="info"
                  icon="📆"
                />
                <MetricCard
                  title="Ventas - Total"
                  value={formatMoney(financialData?.allTime?.sales || 0)}
                  type="positive"
                  icon="💎"
                />
              </div>
            </section>
          )}

          {/* Usuarios */}
          {activeSections['usuarios'] && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">👥 Gestión de Usuarios</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                <p className="text-gray-300">Módulo de gestión de usuarios en desarrollo...</p>
              </div>
            </section>
          )}

          {/* Sesiones Activas */}
          {activeSections['sesiones-activas'] && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">🎮 Sesiones de Juego Activas</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                <p className="text-gray-300">Monitoreo de sesiones en tiempo real...</p>
              </div>
            </section>
          )}

          {/* Pozos y Premios */}
          {activeSections['sesiones-pozos'] && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">💰 Pozos y Premios</h2>
              <PotStatus 
                lineaPot={financialData?.pots?.linea || 0}
                bingoPot={financialData?.pots?.bingo || 0}
                acumulado={financialData?.pots?.acumulado || 0}
              />
            </section>
          )}

          {/* Sistema */}
          {activeSections['sistema'] && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">⚠️ Alertas del Sistema</h2>
              <AlertsList />
            </section>
          )}

          {/* Si no hay secciones activas, mostrar mensaje */}
          {!Object.values(activeSections).some(v => v) && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-gray-400 text-xl mb-4">
                  Selecciona una sección del menú lateral
                </p>
                <p className="text-gray-500">
                  Usa el sidebar para navegar por las diferentes funcionalidades
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
