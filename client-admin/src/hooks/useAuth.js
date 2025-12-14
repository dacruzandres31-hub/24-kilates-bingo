import { useState, useEffect } from 'react';

/**
 * Hook para verificar permisos del usuario actual
 * @returns {Object} - Información del usuario y funciones de verificación
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('adminUser');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  const isSuperAdmin = () => {
    return user?.role === 'superadmin';
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'agente';
  };

  const hasPermission = (permission) => {
    const permissions = {
      // Permisos exclusivos de SuperAdmin
      'manage_prices': isSuperAdmin(),
      'gift_cards': isSuperAdmin(),
      'gift_balance': isSuperAdmin(),
      'system_stats': isSuperAdmin(),
      'view_all_history': isSuperAdmin(),
      
      // Permisos compartidos (Admin y SuperAdmin)
      'manage_users': isAdmin(),
      'manage_cards': isAdmin(),
      'manage_balance': isAdmin(),
      'view_stats': isAdmin(),
      'create_sessions': isAdmin(),
    };

    return permissions[permission] || false;
  };

  return {
    user,
    isLoading,
    isSuperAdmin,
    isAdmin,
    hasPermission
  };
}
