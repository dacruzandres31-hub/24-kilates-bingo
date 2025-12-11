# 👑 SISTEMA SUPERADMIN - Capacidades Exclusivas

## 📋 Resumen

Se ha implementado un sistema de **SuperAdmin** con capacidades especiales que van más allá de los administradores regulares. Este usuario es la raíz del árbol jerárquico y tiene control total sobre el sistema.

## 🔐 Credenciales SuperAdmin

```
Usuario: admin
Contraseña: Admin24K!2025
Rol: superadmin
ID: 1
Jerarquía: RAÍZ (sin padre)
```

**⚠️ IMPORTANTE**: Cambia esta contraseña después del primer login por seguridad.

---

## 🎯 Capacidades Exclusivas del SuperAdmin

### 1️⃣ Gestión de Precios de Cartones

**Endpoint**: `PUT /api/superadmin/card-prices/:room`

Permite modificar el precio de los cartones para cada sala en tiempo real.

**Body**:
```json
{
  "price": 2000
}
```

**Ejemplo**:
```bash
# Cambiar precio de sala Bronce a $2,000
PUT /api/superadmin/card-prices/bronce
{
  "price": 2000
}
```

**Consultar precios actuales**:
```bash
GET /api/superadmin/card-prices
```

**Salas disponibles**:
- `bronce` (default: $1,000)
- `plata` (default: $5,000)
- `oro` (default: $10,000)
- `free_starter` (default: $0)

---

### 2️⃣ Acreditación de Cartones de Regalo

**Endpoint**: `POST /api/superadmin/gift-cards`

Otorga cartones gratuitos a cualquier usuario como regalo o bonificación.

**Body**:
```json
{
  "userId": 5,
  "room": "bronce",
  "quantity": 10,
  "reason": "Bono de bienvenida"
}
```

**Ejemplo**:
```bash
# Regalar 10 cartones de Oro al usuario ID 5
POST /api/superadmin/gift-cards
{
  "userId": 5,
  "room": "oro",
  "quantity": 10,
  "reason": "Premio por actividad"
}
```

**Salas válidas**: `bronce`, `plata`, `oro`

---

### 3️⃣ Acreditación de Saldo de Regalo

**Endpoint**: `POST /api/superadmin/gift-balance`

Agrega saldo gratuito a la cuenta de cualquier usuario.

**Body**:
```json
{
  "userId": 5,
  "amount": 50000,
  "reason": "Bono especial"
}
```

**Ejemplo**:
```bash
# Regalar $50,000 al usuario ID 5
POST /api/superadmin/gift-balance
{
  "userId": 5,
  "amount": 50000,
  "reason": "Compensación por inconveniente técnico"
}
```

---

### 4️⃣ Historial de Regalos Otorgados

**Endpoint**: `GET /api/superadmin/gift-history`

Consulta el historial completo de todos los regalos (cartones y saldo) otorgados.

**Respuesta**:
```json
{
  "success": true,
  "cardGifts": [
    {
      "id": 1,
      "user_id": 5,
      "room": "oro",
      "quantity": 10,
      "reason": "Premio por actividad",
      "granted_by": 1,
      "recipient_username": "jugador123",
      "granted_by_username": "admin",
      "created_at": "2025-12-11T10:30:00Z"
    }
  ],
  "balanceGifts": [
    {
      "id": 15,
      "user_id": 5,
      "amount": 50000,
      "description": "Regalo del SuperAdmin: admin",
      "recipient_username": "jugador123",
      "created_at": "2025-12-11T10:35:00Z"
    }
  ]
}
```

---

### 5️⃣ Estadísticas Avanzadas del Sistema

**Endpoint**: `GET /api/superadmin/system-stats`

Obtiene métricas completas del sistema solo disponibles para SuperAdmin.

**Respuesta**:
```json
{
  "success": true,
  "stats": {
    "total_superadmins": 1,
    "total_agentes": 5,
    "total_jugadores": 150,
    "total_balance_sistema": 5000000,
    "sesiones_activas": 3,
    "sesiones_completadas": 287,
    "total_depositos": 10000000,
    "total_retiros": 3500000,
    "total_bonos": 450000
  }
}
```

---

## 🗂️ Tablas Nuevas Creadas

### `card_prices`
Almacena el historial de precios de cartones.

```sql
CREATE TABLE card_prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room ENUM('bronce', 'plata', 'oro', 'free_starter') NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

### `gift_movements`
Registra todos los regalos de cartones otorgados.

```sql
CREATE TABLE gift_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  quantity INT NOT NULL,
  reason TEXT,
  granted_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id)
);
```

---

## 🔒 Seguridad

### Middleware `requireSuperAdmin`

Todas las rutas de SuperAdmin están protegidas por 3 capas:

1. **`authenticateToken`**: Verifica JWT válido
2. **`isAdmin`**: Verifica que el usuario tiene rol de admin/superadmin
3. **`requireSuperAdmin`**: Verifica que el rol es exactamente 'superadmin'

**Código**:
```javascript
function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado. Solo SuperAdmin puede realizar esta acción.'
    });
  }
  next();
}
```

---

## 📁 Archivos Creados/Modificados

### Nuevos Archivos

1. **`server/create_superadmin.js`**: Script para crear/resetear SuperAdmin
2. **`server/src/controllers/superAdminController.js`**: Controladores de funciones exclusivas
3. **`server/src/routes/superAdminRoutes.js`**: Rutas protegidas de SuperAdmin

### Modificados

1. **`server/src/index.js`**: Registro de rutas `/api/superadmin`
2. **`server/src/controllers/adminController.js`**: Corregido uso de `password_hash` y `bcryptjs`

---

## 🚀 Uso del Script de Configuración

Para crear o resetear el SuperAdmin:

```bash
cd server
node create_superadmin.js
```

**Lo que hace el script**:
- ✅ Verifica si existe un SuperAdmin raíz
- ✅ Si existe: Resetea la contraseña a `Admin24K!2025`
- ✅ Si no existe: Crea usuario `SUPERADMIN` con contraseña `Admin24K!2025`
- ✅ Crea tabla `card_prices` con precios por defecto
- ✅ Configura permisos `can_process_payouts = true`

---

## 🎮 Próximos Pasos Recomendados

### En el Frontend (Panel Admin)

Crear una sección exclusiva "🔐 SuperAdmin" con:

1. **Gestión de Precios**:
   - Lista de salas con precios actuales
   - Formulario para cambiar precio
   - Historial de cambios de precios

2. **Acreditación de Regalos**:
   - Selector de usuario (autocompletado)
   - Tipo de regalo: Cartones / Saldo
   - Cantidad y motivo

3. **Dashboard de Estadísticas**:
   - Gráficos de usuarios por rol
   - Balance total del sistema
   - Volumen de depósitos vs retiros
   - Total de bonos otorgados

4. **Auditoría**:
   - Historial de regalos otorgados
   - Log de cambios de precios
   - Actividad de otros admins

### Seguridad Adicional

- Implementar log de auditoría para todas las acciones de SuperAdmin
- Agregar confirmación con segundo factor para cambios críticos
- Notificaciones por email cuando se otorgan regalos grandes

---

## 📞 Soporte

Para cualquier duda sobre las capacidades de SuperAdmin o problemas técnicos, consultar este documento o el código fuente en:
- `server/src/controllers/superAdminController.js`
- `server/src/routes/superAdminRoutes.js`
