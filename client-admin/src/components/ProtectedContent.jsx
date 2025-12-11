import React from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Componente que renderiza contenido solo si el usuario tiene el permiso requerido
 * @param {string} permission - Nombre del permiso requerido
 * @param {React.ReactNode} children - Contenido a renderizar si tiene permiso
 * @param {React.ReactNode} fallback - Contenido alternativo si no tiene permiso (opcional)
 */
export function ProtectedContent({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Componente que muestra contenido solo para SuperAdmin
 */
export function SuperAdminOnly({ children, fallback = null }) {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin()) {
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Componente que muestra un badge indicando el rol del usuario
 */
export function RoleBadge() {
  const { user, isSuperAdmin } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
        isSuperAdmin() 
          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
          : 'bg-blue-500 text-white'
      }`}>
        {isSuperAdmin() ? '👑 SUPERADMIN' : '🔧 ADMIN'}
      </span>
      <span className="text-sm text-slate-400">{user.username}</span>
    </div>
  );
}
