# 🔐 Sistema de Permisos - Panel de Administración

## 📋 Resumen

El panel de administración tiene **dos niveles de acceso**:

### 👑 SuperAdmin (Andy)
- **Usuario único y exclusivo** en la raíz del árbol
- Acceso a **TODAS** las funcionalidades
- Funcionalidades exclusivas:
  - 💰 Gestión de precios de cartones
  - 🎁 Acreditación de cartones de regalo
  - 💵 Acreditación de saldo de regalo
  - 📊 Estadísticas avanzadas del sistema
  - 📜 Historial completo de regalos otorgados

### 🔧 Admin Regular
- Usuarios creados bajo el SuperAdmin
- Acceso a funcionalidades estándar:
  - 👥 Gestión de usuarios (crear, editar)
  - 🎫 Gestión de cartones (asignar, quitar)
  - 💸 Gestión de saldo (cargar, descargar)
  - 📈 Estadísticas básicas
  - 🎮 Creación de sesiones de juego

---

## 🛠️ Cómo Implementar Permisos en el Frontend

### 1. Usar el Hook `useAuth`

```jsx
import { useAuth } from '../hooks/useAuth';

function MiComponente() {
  const { user, isSuperAdmin, hasPermission } = useAuth();

  return (
    <div>
      <p>Hola {user.username}</p>
      {isSuperAdmin() && <p>Eres SuperAdmin!</p>}
    </div>
  );
}
```

### 2. Proteger Secciones Completas

```jsx
import { SuperAdminOnly } from '../components/ProtectedContent';

function Dashboard() {
  return (
    <div>
      {/* Visible para todos los admins */}
      <div>Gestión de Usuarios</div>

      {/* Solo visible para SuperAdmin */}
      <SuperAdminOnly>
        <div className="bg-yellow-500 p-4">
          <h2>🔐 Zona SuperAdmin</h2>
          <button>Gestionar Precios</button>
          <button>Regalar Cartones</button>
        </div>
      </SuperAdminOnly>
    </div>
  );
}
```

### 3. Proteger por Permiso Específico

```jsx
import { ProtectedContent } from '../components/ProtectedContent';

function GestionUsuarios() {
  return (
    <div>
      {/* Solo si tiene permiso 'gift_balance' (SuperAdmin) */}
      <ProtectedContent permission="gift_balance">
        <button className="bg-green-500">
          💰 Regalar Saldo
        </button>
      </ProtectedContent>

      {/* Solo si tiene permiso 'manage_users' (Admin y SuperAdmin) */}
      <ProtectedContent permission="manage_users">
        <button className="bg-blue-500">
          ➕ Crear Usuario
        </button>
      </ProtectedContent>
    </div>
  );
}
```

### 4. Mostrar Badge de Rol

```jsx
import { RoleBadge } from '../components/ProtectedContent';

function Header() {
  return (
    <div className="flex justify-between items-center">
      <h1>Panel de Administración</h1>
      <RoleBadge /> {/* Muestra: 👑 SUPERADMIN Andy o 🔧 ADMIN usuario */}
    </div>
  );
}
```

---

## 📚 Lista Completa de Permisos

### Permisos Exclusivos de SuperAdmin
| Permiso | Descripción |
|---------|-------------|
| `manage_prices` | Gestionar precios de cartones |
| `gift_cards` | Acreditar cartones de regalo |
| `gift_balance` | Acreditar saldo de regalo |
| `system_stats` | Ver estadísticas avanzadas del sistema |
| `view_all_history` | Ver historial completo de regalos |

### Permisos Compartidos (Admin + SuperAdmin)
| Permiso | Descripción |
|---------|-------------|
| `manage_users` | Crear y gestionar usuarios |
| `manage_cards` | Asignar/quitar cartones |
| `manage_balance` | Cargar/descargar saldo |
| `view_stats` | Ver estadísticas básicas |
| `create_sessions` | Crear sesiones de juego |

---

## 🎨 Ejemplo de Sección SuperAdmin en Dashboard

```jsx
import { SuperAdminOnly } from '../components/ProtectedContent';
import { useAuth } from '../hooks/useAuth';

function Dashboard() {
  const { isSuperAdmin } = useAuth();

  return (
    <div className="space-y-6">
      {/* Sección visible para todos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">📊 Estadísticas Generales</h2>
        {/* Contenido para todos */}
      </div>

      {/* Sección EXCLUSIVA para SuperAdmin */}
      <SuperAdminOnly>
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl">👑</span>
            <h2 className="text-2xl font-bold text-black">Zona SuperAdmin</h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Gestión de Precios */}
            <button 
              onClick={() => setActiveSection('prices')}
              className="bg-white hover:bg-gray-100 text-black font-bold py-4 px-6 rounded-lg transition-colors"
            >
              💰 Precios de Cartones
            </button>

            {/* Regalar Cartones */}
            <button 
              onClick={() => setActiveSection('giftCards')}
              className="bg-white hover:bg-gray-100 text-black font-bold py-4 px-6 rounded-lg transition-colors"
            >
              🎁 Regalar Cartones
            </button>

            {/* Regalar Saldo */}
            <button 
              onClick={() => setActiveSection('giftBalance')}
              className="bg-white hover:bg-gray-100 text-black font-bold py-4 px-6 rounded-lg transition-colors"
            >
              💵 Regalar Saldo
            </button>
          </div>
        </div>
      </SuperAdminOnly>

      {/* Gestión de Usuarios - visible para todos los admins */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">👥 Gestión de Usuarios</h2>
        {/* Contenido para Admin y SuperAdmin */}
      </div>
    </div>
  );
}
```

---

## 🔄 Flujo de Autenticación

```
1. Usuario hace login con credenciales
   ↓
2. Backend valida y retorna: { token, user: { id, username, role, balance } }
   ↓
3. Frontend guarda:
   - localStorage.setItem('adminToken', token)
   - localStorage.setItem('adminUser', JSON.stringify(user))
   ↓
4. Hook useAuth() lee localStorage y determina permisos
   ↓
5. Componentes usan ProtectedContent/SuperAdminOnly para mostrar/ocultar
```

---

## ⚠️ Importante

1. **Seguridad en Backend**: Aunque el frontend oculta secciones, **SIEMPRE** validar permisos en el backend con middleware `requireSuperAdmin`

2. **Consistencia**: Si agregas una nueva funcionalidad exclusiva:
   - Agregar permiso en `useAuth.js`
   - Proteger ruta en backend con `requireSuperAdmin`
   - Usar `<SuperAdminOnly>` en el componente

3. **Testing**: Probar con ambos roles:
   ```
   SuperAdmin: Andy / Tasso2025
   Admin Regular: (crear uno desde panel)
   ```

---

## 📝 Checklist al Crear Nueva Funcionalidad

- [ ] ¿Es exclusiva de SuperAdmin?
  - [ ] Sí → Agregar a `SUPERADMIN_SYSTEM.md`
  - [ ] Sí → Proteger ruta con `requireSuperAdmin` en backend
  - [ ] Sí → Usar `<SuperAdminOnly>` en frontend
  - [ ] No → Usar `<ProtectedContent permission="manage_xxx">`

- [ ] Actualizar lista de permisos en `useAuth.js` si es necesario

- [ ] Probar con usuario SuperAdmin Y usuario Admin regular

- [ ] Verificar que el backend rechaza solicitudes no autorizadas

---

## 🎯 Próximos Pasos

1. Integrar `<RoleBadge />` en el header del Dashboard
2. Crear sección SuperAdmin con los 5 botones exclusivos
3. Implementar modales para cada funcionalidad SuperAdmin
4. Agregar confirmaciones para acciones críticas
5. Crear historial de acciones de SuperAdmin (auditoría)
