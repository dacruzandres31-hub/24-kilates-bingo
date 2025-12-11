import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import MetricCard from '../components/MetricCard';
import PotStatus from '../components/PotStatus';
import AlertsList from '../components/AlertsList';
import Sidebar from '../components/Sidebar';
import EstadisticasGenerales from '../components/EstadisticasGenerales';
import GestionUsuarios from '../components/GestionUsuarios';
import CardInventoryPanel from '../components/CardInventoryPanel';
import AdminCardInventory from '../components/AdminCardInventory';
import { SuperAdminOnly } from '../components/ProtectedContent';
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
  const stockButtonRef = useRef(null);
  const perfilButtonRef = useRef(null);
  const [dropdownPositions, setDropdownPositions] = useState({ stock: {}, perfil: {} });
  const [activeSections, setActiveSections] = useState({
    'estadisticas-generales': true,
    'usuarios': false,
    'card-inventory': false,
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (stockButtonRef.current && !stockButtonRef.current.contains(event.target)) {
        const stockDropdown = document.querySelector('[data-dropdown="stock"]');
        if (stockDropdown && !stockDropdown.contains(event.target)) {
          setShowCartonesDropdown(false);
        }
      }
      if (perfilButtonRef.current && !perfilButtonRef.current.contains(event.target)) {
        const perfilDropdown = document.querySelector('[data-dropdown="perfil"]');
        if (perfilDropdown && !perfilDropdown.contains(event.target)) {
          setShowPerfilDropdown(false);
        }
      }
    };

    if (showCartonesDropdown || showPerfilDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCartonesDropdown, showPerfilDropdown]);

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

  const calculateDropdownPosition = (buttonRef) => {
    if (!buttonRef.current) return {};
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right
    };
  };

  const handleStockDropdown = () => {
    setShowPerfilDropdown(false); // Cerrar perfil si está abierto
    if (!showCartonesDropdown) {
      setDropdownPositions(prev => ({
        ...prev,
        stock: calculateDropdownPosition(stockButtonRef)
      }));
    }
    setShowCartonesDropdown(!showCartonesDropdown);
  };

  const handlePerfilDropdown = () => {
    setShowCartonesDropdown(false); // Cerrar stock si está abierto
    if (!showPerfilDropdown) {
      setDropdownPositions(prev => ({
        ...prev,
        perfil: calculateDropdownPosition(perfilButtonRef)
      }));
    }
    setShowPerfilDropdown(!showPerfilDropdown);
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
        <header className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-md border-b border-gray-700/50 px-4 sm:px-6 lg:px-8 py-5 shadow-xl">
          <div className="flex items-center justify-between">
            {/* Logo - Izquierda */}
            <div className="flex items-center space-x-4">
              <img src="/logo.png" alt="Bingo 24K" className="h-14 drop-shadow-lg" />
            </div>

            {/* Nombre del Usuario - Centro */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">
                {userData?.username || 'Admin'}
              </h2>
            </div>

            {/* Controles - Derecha */}
            <div className="flex items-center space-x-3">
              {/* Botón Refrescar */}
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                🔄
              </button>

              {/* Stock de Cartones */}
              <div className="relative">
                <button
                  ref={stockButtonRef}
                  onClick={handleStockDropdown}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50 rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  <span className="text-white font-semibold text-sm">📦 Stock</span>
                  {showCartonesDropdown ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Perfil */}
              <div className="relative">
                <button
                  ref={perfilButtonRef}
                  onClick={handlePerfilDropdown}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="font-semibold text-sm">👤 Perfil</span>
                  {showPerfilDropdown ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
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

          {/* Inventario de Cartones */}
          {activeSections['card-inventory'] && (
            <section className="mb-8">
              <SuperAdminOnly fallback={<AdminCardInventory />}>
                <CardInventoryPanel />
              </SuperAdminOnly>
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

      {/* Dropdowns renderizados usando Portals fuera del stacking context del header */}
      {showCartonesDropdown && createPortal(
        <div 
          data-dropdown="stock"
          className="fixed bg-gray-800/95 backdrop-blur-lg border border-gray-700/50 rounded-xl shadow-2xl p-4 min-w-[280px]"
          style={{
            top: `${dropdownPositions.stock.top}px`,
            right: `${dropdownPositions.stock.right}px`,
            zIndex: 2147483647
          }}
        >
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
        </div>,
        document.body
      )}

      {showPerfilDropdown && createPortal(
        <div 
          data-dropdown="perfil"
          className="fixed bg-gray-800/95 backdrop-blur-lg border border-gray-700/50 rounded-xl shadow-2xl min-w-[220px] overflow-hidden"
          style={{
            top: `${dropdownPositions.perfil.top}px`,
            right: `${dropdownPositions.perfil.right}px`,
            zIndex: 2147483647
          }}
        >
          <button
            className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700/50 transition-all flex items-center space-x-2 text-sm"
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
        </div>,
        document.body
      )}
    </div>
  );
}
