import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import MetricCard from '../components/MetricCard';
import PotStatus from '../components/PotStatus';
import AlertsList from '../components/AlertsList';
import Sidebar from '../components/Sidebar';
import EstadisticasGenerales from '../components/EstadisticasGenerales';
import GestionUsuarios from '../components/GestionUsuarios';

import AllInventoriesPanel from '../components/AllInventoriesPanel';
import CardMovementsHistory from '../components/CardMovementsHistory';
import { SuperAdminOnly } from '../components/ProtectedContent';

// Paneles de Sesiones y Pozos
import PotStatusPanel from '../components/PotStatusPanel';
import SessionStatusPanel from '../components/SessionStatusPanel';
import SessionControlPanel from '../components/SessionControlPanel';
import LiveMonitoringPanel from '../components/LiveMonitoringPanel';
import RoomConfigPanel from '../components/RoomConfigPanel';
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
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordStrength, setPasswordStrength] = useState({ level: 0, text: '', color: '' });
  const stockButtonRef = useRef(null);
  const perfilButtonRef = useRef(null);
  const [dropdownPositions, setDropdownPositions] = useState({ stock: {}, perfil: {} });
  const [activeSections, setActiveSections] = useState({
    'estadisticas-generales': true,
    'usuarios': false,
    'card-inventory': false,
    'inventories-panel': false,
    'movements-history': false,
    'finanzas-hoy': false,
    'movimientos': false,
    'movimientos-recientes': false,
    'pozos': false,
    'sesiones-stats': false,
    'sesiones-control': false,
    'sesiones-live': false,
    'room-config': false,
    'alertas': false
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Cerrar dropdown de recursos si se hace clic fuera
      if (showCartonesDropdown && stockButtonRef.current) {
        const stockDropdown = document.querySelector('[data-dropdown="stock"]');
        if (stockDropdown && !stockDropdown.contains(event.target) && !stockButtonRef.current.contains(event.target)) {
          setShowCartonesDropdown(false);
        }
      }
      
      // Cerrar dropdown de perfil si se hace clic fuera
      if (showPerfilDropdown && perfilButtonRef.current) {
        const perfilDropdown = document.querySelector('[data-dropdown="perfil"]');
        if (perfilDropdown && !perfilDropdown.contains(event.target) && !perfilButtonRef.current.contains(event.target)) {
          setShowPerfilDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCartonesDropdown, showPerfilDropdown]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const [userRes, finRes, inventoryRes] = await Promise.all([
        axios.get('/api/admin/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/financial-summary', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/cards/inventory', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setUserData(userRes.data);
      setFinancialData(finRes.data);
      
      // Convertir inventario a formato de stock
      const inventory = inventoryRes.data.inventory || [];
      setCartonesStock({
        bronce: parseInt(inventory.find(i => i.room === 'bronce')?.total_quantity || 0),
        plata: parseInt(inventory.find(i => i.room === 'plata')?.total_quantity || 0),
        oro: parseInt(inventory.find(i => i.room === 'oro')?.total_quantity || 0)
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

  const handleStockDropdown = (e) => {
    console.log('🔵 handleStockDropdown ejecutado', { 
      showCartonesDropdown, 
      hasRef: !!stockButtonRef.current 
    });
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setShowPerfilDropdown(false);
    
    if (stockButtonRef.current) {
      const rect = stockButtonRef.current.getBoundingClientRect();
      console.log('📍 Posición del botón:', {
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
        willShow: !showCartonesDropdown
      });
      
      setDropdownPositions(prev => ({
        ...prev,
        stock: {
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        }
      }));
    }
    
    setShowCartonesDropdown(prev => !prev);
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

  const calculatePasswordStrength = (password) => {
    if (!password) return { level: 0, text: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return { level: 1, text: 'Débil', color: 'text-red-500' };
    if (strength <= 3) return { level: 2, text: 'Media', color: 'text-yellow-500' };
    return { level: 3, text: 'Fuerte', color: 'text-green-500' };
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('❌ Las contraseñas no coinciden');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('❌ La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/admin/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('✅ Contraseña cambiada exitosamente');
      setShowChangePasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      alert('❌ ' + (error.response?.data?.error || 'Error al cambiar la contraseña'));
    }
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

              {/* Recursos Disponibles */}
              <div className="relative">
                <button
                  ref={stockButtonRef}
                  onClick={handleStockDropdown}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border border-purple-500/50 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  <span className="text-white font-semibold text-sm">💼 Recursos</span>
                  {showCartonesDropdown ? (
                    <ChevronDown className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white" />
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

          {/* Gestión de Usuarios - Siempre montado para escuchar eventos */}
          <section className={activeSections['usuarios'] ? 'mb-8' : 'hidden'}>
            <GestionUsuarios 
              sharedUserData={userData}
              sharedCartonesStock={cartonesStock}
              onResourcesUpdate={(newUserData, newCartonesStock) => {
                if (newUserData) setUserData(newUserData);
                if (newCartonesStock) setCartonesStock(newCartonesStock);
              }}
            />
          </section>

          {/* Ver Inventarios de Red */}
          {activeSections['inventories-panel'] && (
            <section className="mb-8">
              <AllInventoriesPanel />
            </section>
          )}

          {/* Historial de Movimientos */}
          {activeSections['movements-history'] && (
            <section className="mb-8">
              <CardMovementsHistory />
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

          {/* Estado de Pozos */}
          {activeSections['pozos'] && (
            <section className="mb-8">
              <PotStatusPanel />
            </section>
          )}

          {/* Estado de Sesiones */}
          {activeSections['sesiones-stats'] && (
            <section className="mb-8">
              <SessionStatusPanel />
            </section>
          )}

          {/* Control de Sesiones (SuperAdmin only) */}
          {activeSections['sesiones-control'] && (
            <section className="mb-8">
              <SuperAdminOnly>
                <SessionControlPanel />
              </SuperAdminOnly>
            </section>
          )}

          {/* Monitoreo en Vivo */}
          {activeSections['sesiones-live'] && (
            <section className="mb-8">
              <LiveMonitoringPanel userRole={userData?.role} />
            </section>
          )}

          {/* Configuración de Salas (SuperAdmin only) */}
          {activeSections['room-config'] && (
            <section className="mb-8">
              <SuperAdminOnly>
                <RoomConfigPanel />
              </SuperAdminOnly>
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
          className="fixed bg-gradient-to-br from-gray-900/98 to-gray-800/98 backdrop-blur-xl border border-purple-500/50 rounded-xl shadow-2xl p-5 min-w-[320px]"
          style={{
            top: dropdownPositions.stock?.top !== undefined ? `${dropdownPositions.stock.top}px` : '80px',
            right: dropdownPositions.stock?.right !== undefined ? `${dropdownPositions.stock.right}px` : '20px',
            zIndex: 99999
          }}
        >
          <div className="mb-4 pb-3 border-b border-gray-700">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              💼 Recursos Disponibles
            </h3>
            <p className="text-xs text-gray-400 mt-1">Panel de {userData?.username || 'Administrador'}</p>
          </div>
          
          <div className="space-y-3">
            {/* Balance */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-900/40 to-emerald-900/30 border border-green-600/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">💰</span>
                <span className="text-green-300 font-semibold">Balance:</span>
              </div>
              <span className="text-white font-bold text-lg">${Math.floor(userData?.balance || 0).toLocaleString('es-CO')}</span>
            </div>

            {/* Bronce */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-900/30 to-orange-800/20 border border-orange-700/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full"></div>
                <span className="text-orange-300 font-semibold">Bronce:</span>
              </div>
              <span className="text-white font-bold text-lg">{(cartonesStock.bronce || 0).toLocaleString('es-CO')}</span>
            </div>

            {/* Plata */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-700/30 to-gray-600/20 border border-gray-500/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full"></div>
                <span className="text-gray-300 font-semibold">Plata:</span>
              </div>
              <span className="text-white font-bold text-lg">{(cartonesStock.plata || 0).toLocaleString('es-CO')}</span>
            </div>

            {/* Oro */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-600/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
                <span className="text-yellow-300 font-semibold">Oro:</span>
              </div>
              <span className="text-white font-bold text-lg">{(cartonesStock.oro || 0).toLocaleString('es-CO')}</span>
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
              setShowChangePasswordModal(true);
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

      {/* Modal de Cambiar Contraseña */}
      {showChangePasswordModal && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-purple-500/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600">
              <h3 className="text-2xl font-bold text-white text-center">
                🔑 Cambiar Contraseña
              </h3>
            </div>

            {/* Body */}
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-300 font-semibold mb-2 text-sm">
                  Contraseña Actual:
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Ingresa tu contraseña actual"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-purple-400 transition-colors text-lg"
                  >
                    {showPasswords.current ? '👁' : '🔒'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2 text-sm">
                  Nueva Contraseña:
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      const newPwd = e.target.value;
                      setPasswordData({ ...passwordData, newPassword: newPwd });
                      setPasswordStrength(calculatePasswordStrength(newPwd));
                    }}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-purple-400 transition-colors text-lg"
                  >
                    {showPasswords.new ? '👁' : '🔒'}
                  </button>
                </div>
                {passwordData.newPassword && passwordStrength.level > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.level === 1 ? 'bg-red-500 w-1/3' :
                          passwordStrength.level === 2 ? 'bg-yellow-500 w-2/3' :
                          'bg-green-500 w-full'
                        }`}
                      ></div>
                    </div>
                    <span className={`text-sm font-semibold ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2 text-sm">
                  Confirmar Nueva Contraseña:
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Repite la nueva contraseña"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-purple-400 transition-colors text-lg"
                  >
                    {showPasswords.confirm ? '👁' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-xl transition-all"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all"
                >
                  ✓ CAMBIAR
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
