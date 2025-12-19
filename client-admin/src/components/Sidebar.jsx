import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function Sidebar({ activeSections, onToggleSection }) {
  const [userRole, setUserRole] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({
    estadisticas: true,
    finanzas: true,
    usuarios: true,
    sesiones: true,
    sistema: true
  });

  useEffect(() => {
    // Obtener rol del usuario desde localStorage
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }, []);

  const toggleMenu = (menu) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const menuItems = [
    {
      id: 'estadisticas',
      title: '📊 Estadísticas',
      icon: '📊',
      sections: [
        { id: 'estadisticas-generales', name: 'Dashboard General' }
      ]
    },
    {
      id: 'usuarios',
      title: '👥 Usuarios',
      icon: '👥',
      sections: []
    },
    {
      id: 'finanzas',
      title: '💰 Finanzas',
      icon: '💰',
      sections: [
        { id: 'finanzas', name: 'Panel de Finanzas Completo' },
        { id: 'finanzas-hoy', name: 'Finanzas de Hoy' },
        { id: 'movimientos', name: 'Movimientos del Día' },
        { id: 'movimientos-recientes', name: 'Últimos Movimientos' }
      ]
    },
    {
      id: 'card-inventory',
      title: '📦 Inventario de Cartones',
      icon: '📦',
      sections: [
        { id: 'inventories-panel', name: 'Ver Inventarios de Red' },
        { id: 'movements-history', name: 'Historial de Movimientos' }
      ]
    },
    {
      id: 'sesiones',
      title: '🎲 Sesiones y Pozos',
      icon: '🎲',
      sections: [
        { id: 'pozos', name: 'Estado de Pozos' },
        { id: 'sesiones-stats', name: 'Estado de Sesiones' },
        { id: 'sesiones-control', name: 'Control de Sesiones', superAdminOnly: true },
        { id: 'sesiones-live', name: 'Monitoreo en Vivo' },
        { id: 'room-config', name: 'Configuración de Salas', superAdminOnly: true },
        { id: 'horarios-config', name: 'Configuración de Horarios', superAdminOnly: true }
      ]
    },
    {
      id: 'sistema',
      title: '⚙️ Sistema',
      icon: '⚙️',
      sections: [
        { id: 'alertas', name: 'Alertas del Sistema' }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold text-slate-300 mb-4">Navegación</h2>

        <nav className="space-y-2">
          {menuItems.map((menu) => (
            <div key={menu.id}>
              {/* Menu Header */}
              <button
                onClick={() => {
                  if (menu.sections.length === 0) {
                    // Si no tiene secciones, activar directamente
                    onToggleSection(menu.id);
                  } else {
                    toggleMenu(menu.id);
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors text-left"
              >
                <span className="flex items-center gap-2 text-slate-200 font-medium">
                  <span>{menu.icon}</span>
                  <span className="text-sm">{menu.title}</span>
                </span>
                {menu.sections.length > 0 && (
                  expandedMenus[menu.id] ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )
                )}
              </button>

              {/* Submenu Items */}
              {menu.sections.length > 0 && expandedMenus[menu.id] && (
                <div className="ml-6 mt-1 space-y-1">
                  {menu.sections
                    .filter(section => !section.superAdminOnly || userRole === 'superadmin')
                    .map((section) => (
                      <button
                        key={section.id}
                        onClick={() => onToggleSection(section.id)}
                        className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-all ${
                          activeSections[section.id]
                            ? 'bg-gold-500/20 text-gold-300 border-l-2 border-gold-500'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {section.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer del Sidebar */}
      <div className="p-4 border-t border-slate-700 mt-auto">
        <p className="text-xs text-slate-500 text-center">
          Panel Admin v1.0
        </p>
      </div>
    </aside>
  );
}
