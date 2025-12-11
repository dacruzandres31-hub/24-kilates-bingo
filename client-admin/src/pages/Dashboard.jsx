import { useState, useEffect } from 'react';
import axios from 'axios';
import MetricCard from '../components/MetricCard';
import PotStatus from '../components/PotStatus';
import AlertsList from '../components/AlertsList';
import Sidebar from '../components/Sidebar';
import EstadisticasGenerales from '../components/EstadisticasGenerales';
import GestionUsuarios from '../components/GestionUsuarios';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartonesStock, setCartonesStock] = useState({
    bronce: 0,
    plata: 0,
    oro: 0
  });
  const [showCartonesDropdown, setShowCartonesDropdown] = useState(false);
  const [showPerfilDropdown, setShowPerfilDropdown] = useState(false);
  const [activeSections, setActiveSections] = useState({
    'estadisticas-generales': true,
    'usuarios': false,
    'finanzas-hoy': false,
    'movimientos': false,
    'movimientos-recientes': false,
    'pozos': false,
    'sesiones-stats': false,
    'alertas': false
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const [userRes, finRes, stockRes] = await Promise.all([
        axios.get('/api/admin/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/financial-summary', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/stock-summary', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setUserData(userRes.data);
      setFinancialData(finRes.data);
      setCartonesStock({
        bronce: stockRes.data.bronce || 0,
        plata: stockRes.data.plata || 0,
        oro: stockRes.data.oro || 0
      });
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
    setActiveSections(prev => {
      // Crear nuevo objeto con todas las secciones en false
      const newSections = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {});
      
      // Activar solo la sección clickeada
      newSections[sectionId] = true;
      
      return newSections;
    });
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
            {/* Logo - Izquierda */}
            <div className="flex items-center space-x-4">
              <img src="/logo.png" alt="Bingo 24K" className="h-12" />
            </div>

            {/* Nombre del Usuario - Centro */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600">
                {userData?.username || 'Admin'}
              </h2>
            </div>

            {/* Controles - Derecha */}
            <div className="flex items-center space-x-4">
              {/* Botón Refrescar */}
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                🔄
              </button>

              {/* Stock de Cartones */}
              <div className="relative">
                <button
                  onClick={() => setShowCartonesDropdown(!showCartonesDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors"
                >
                  <span className="text-white font-semibold">📦 Stock</span>
                  {showCartonesDropdown ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Dropdown Stock */}
                {showCartonesDropdown && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 min-w-[280px] z-[9999]">
                    <div className="space-y-3">
                      {/* Bronce */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-900/30 to-orange-800/20 border border-orange-700/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full"></div>
                          <span className="text-orange-300 font-semibold">BRONCE:</span>
                        </div>
                        <span className="text-white font-bold text-lg">{cartonesStock.bronce}</span>
                      </div>

                      {/* Plata */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-700/30 to-gray-600/20 border border-gray-500/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full"></div>
                          <span className="text-gray-300 font-semibold">PLATA:</span>
                        </div>
                        <span className="text-white font-bold text-lg">{cartonesStock.plata}</span>
                      </div>

                      {/* Oro */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-600/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
                          <span className="text-yellow-300 font-semibold">ORO:</span>
                        </div>
                        <span className="text-white font-bold text-lg">{cartonesStock.oro}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Perfil */}
              <div className="relative">
                <button
                  onClick={() => setShowPerfilDropdown(!showPerfilDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-lg transition-colors"
                >
                  <span className="font-semibold">👤 Perfil</span>
                  {showPerfilDropdown ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {/* Dropdown Perfil */}
                {showPerfilDropdown && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-600 rounded-lg shadow-xl min-w-[220px] z-[9999] overflow-hidden">
                    <button
                      className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      onClick={() => {
                        // TODO: Implementar cambio de contraseña
                        alert('Funcionalidad de cambio de contraseña próximamente');
                        setShowPerfilDropdown(false);
                      }}
                    >
                      <span>🔑</span>
                      <span>Cambiar Contraseña</span>
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-900/20 transition-colors flex items-center space-x-2 border-t border-gray-700"
                      onClick={handleLogout}
                    >
                      <span>🚪</span>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
          {/* Estadísticas Generales */}
          {activeSections['estadisticas-generales'] && (
            <section className="mb-8">
              <EstadisticasGenerales financialData={financialData} />
            </section>
          )}

          {/* Gestión de Usuarios */}
          {activeSections['usuarios'] && (
            <section className="mb-8">
              <GestionUsuarios />
            </section>
          )}

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

          {/* Sección de Usuarios eliminada - ya está arriba con el componente GestionUsuarios */}

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
