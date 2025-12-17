# Implementación de Paneles de Inventario Diferenciados por Rol

## Fecha: 17 de Diciembre 2025

## Resumen Ejecutivo

Se implementaron dos nuevos paneles administrativos para control de inventario de cartones con lógica diferenciada por rol:
- **SuperAdmin (Andy)**: Ve distinción entre cartones pagos y gratis, con porcentajes y alertas de cumplimiento de la regla 10%
- **Agentes**: Solo ven totales, sin distinción de tipo de cartón

## Componentes Implementados

### Backend

#### 1. `cardInventoryController.js` - Nuevas Funciones

**`getAllInventories(req, res)`** (líneas 289-437)
- **Ruta**: `GET /api/admin/cards/all-inventories`
- **Descripción**: Retorna inventarios de todos los usuarios de la red jerárquica
- **Lógica Diferenciada**:
  ```javascript
  const isSuperAdmin = req.user.role === 'superadmin';
  
  if (isSuperAdmin) {
    // Query: v_superadmin_inventory (con normal_cards, gift_cards, free_percentage)
    // Stats: total_paid, total_free, global_free_percentage, users_with_alerts, compliance_rate
  } else {
    // Query: v_admin_inventory (solo total_cards)
    // Stats: total_cards únicamente
  }
  ```
- **Respuesta SuperAdmin**:
  ```json
  {
    "role": "superadmin",
    "stats": {
      "total_cards": 150,
      "total_paid": 130,
      "total_free": 20,
      "global_free_percentage": 13.33,
      "users_with_alerts": 2,
      "compliance_rate": 80
    },
    "inventories": [
      {
        "user_id": 1,
        "username": "jugador1",
        "role": "jugador",
        "rooms": {
          "bronce": {
            "normal_cards": 30,
            "gift_cards": 5,
            "total_cards": 35,
            "free_percentage": 14.29
          }
        },
        "total_all": 35,
        "total_paid": 30,
        "total_free": 5,
        "avg_free_percentage": 14.29
      }
    ]
  }
  ```
- **Respuesta Agente**:
  ```json
  {
    "role": "agente",
    "stats": {
      "total_cards": 150
    },
    "inventories": [
      {
        "user_id": 1,
        "username": "jugador1",
        "role": "jugador",
        "rooms": {
          "bronce": { "total_cards": 35 },
          "plata": { "total_cards": 20 }
        },
        "total_all": 55
      }
    ]
  }
  ```

**`getAllMovements(req, res)`** (líneas 439-582)
- **Ruta**: `GET /api/admin/cards/all-movements`
- **Descripción**: Historial completo de movimientos de cartones con filtros avanzados
- **Filtros Disponibles**:
  - `user_id`: ID del usuario
  - `room`: bronce, plata, oro
  - `movement_type`: credit, debit, transfer_send, transfer_receive, refund, expired
  - `date_from`: Fecha inicio (YYYY-MM-DD)
  - `date_to`: Fecha fin (YYYY-MM-DD)
  - `limit`: Cantidad por página (default: 50)
  - `offset`: Offset para paginación (default: 0)
- **Lógica Diferenciada**:
  ```javascript
  if (isSuperAdmin) {
    // Query incluye columna is_gift
    SELECT cm.*, cm.is_gift, u.username, u_from.username, u_to.username, ...
  } else {
    // Query SIN columna is_gift
    SELECT cm.*, u.username, u_from.username, u_to.username, ...
  }
  ```
- **Respuesta**:
  ```json
  {
    "role": "superadmin",
    "total": 150,
    "limit": 50,
    "offset": 0,
    "movements": [
      {
        "id": 1,
        "user_id": 5,
        "username": "jugador1",
        "room": "bronce",
        "movement_type": "credit",
        "quantity": 10,
        "is_gift": 0,
        "description": "Acreditación manual",
        "from_user_id": null,
        "to_user_id": null,
        "created_at": "2025-12-17T20:30:00.000Z"
      }
    ]
  }
  ```

#### 2. Rutas Agregadas

**adminRoutes.js**:
```javascript
const cardInventoryController = require('../controllers/cardInventoryController');

router.get('/cards/all-inventories', cardInventoryController.getAllInventories);
router.get('/cards/all-movements', cardInventoryController.getAllMovements);
```

**superAdminRoutes.js**:
```javascript
router.get('/cards/all-movements', cardInventoryController.getAllMovements);
// (all-inventories usa la misma ruta que agentes, diferencia por rol)
```

### Frontend

#### 1. `AllInventoriesPanel.jsx`

**Ubicación**: `client-admin/src/components/AllInventoriesPanel.jsx`

**Características**:
- **Vista SuperAdmin**:
  - 4 cards de estadísticas: Total Red, Pagos, Gratis, Cumplimiento
  - Tabla con columnas: Usuario | Bronce (💰|🎁) | Plata (💰|🎁) | Oro (💰|🎁) | Total | Estado
  - Indicadores de alerta:
    - ✅ Verde: ≤10% gratis (cumple regla)
    - ⚠️ Amarillo: 10-20% gratis (advertencia)
    - 🚫 Rojo: >20% gratis (crítico)
  - Filtros: búsqueda usuario, sala, solo con alerta

- **Vista Agente**:
  - 2 cards de estadísticas: Total Red, Usuarios Activos
  - Tabla con columnas: Usuario | Bronce | Plata | Oro | Total
  - Filtros: búsqueda usuario, sala

**Ejemplo de Uso**:
```jsx
import AllInventoriesPanel from '../components/AllInventoriesPanel';

<AllInventoriesPanel />
```

#### 2. `CardMovementsHistory.jsx`

**Ubicación**: `client-admin/src/components/CardMovementsHistory.jsx`

**Características**:
- **4 cards de estadísticas del período**:
  - Total Movimientos
  - ✅ Acreditados
  - ❌ Descontados
  - 🔄 Transferencias

- **Filtros avanzados**:
  - Usuario (ID)
  - Sala (bronce, plata, oro)
  - Tipo de movimiento (6 tipos)
  - Rango de fechas (desde/hasta)
  - **Solo SuperAdmin**: Tipo de cartón (💰 pagos / 🎁 gratis)

- **Tabla de movimientos**:
  - Columnas comunes: Fecha, Usuario, Movimiento, Sala, Cantidad, Detalle
  - **Solo SuperAdmin**: Columna Tipo (muestra 💰 o 🎁)

- **Paginación**:
  - Navegación anterior/siguiente
  - Selector de cantidad por página (25, 50, 100)
  - Contador de páginas

**Ejemplo de Uso**:
```jsx
import CardMovementsHistory from '../components/CardMovementsHistory';

<CardMovementsHistory />
```

#### 3. Integración en Dashboard

**Modificaciones en `Dashboard.jsx`**:

```javascript
// Imports
import AllInventoriesPanel from '../components/AllInventoriesPanel';
import CardMovementsHistory from '../components/CardMovementsHistory';

// Estados
const [activeSections, setActiveSections] = useState({
  'estadisticas-generales': true,
  'usuarios': false,
  'inventories-panel': false,        // NUEVO
  'movements-history': false,       // NUEVO
  'card-management': false,         // NUEVO
  // ... otros
});

// Secciones
{activeSections['inventories-panel'] && (
  <section className="mb-8">
    <AllInventoriesPanel />
  </section>
)}

{activeSections['movements-history'] && (
  <section className="mb-8">
    <CardMovementsHistory />
  </section>
)}
```

**Modificaciones en `Sidebar.jsx`**:

```javascript
{
  id: 'card-inventory',
  title: '📦 Inventario de Cartones',
  icon: '📦',
  sections: [
    { id: 'inventories-panel', name: 'Ver Inventarios de Red' },     // NUEVO
    { id: 'movements-history', name: 'Historial de Movimientos' },   // NUEVO
    { id: 'card-management', name: 'Acreditar/Transferir' }         // RENOMBRADO
  ]
}
```

## Seguridad

### Restricciones de Acceso

1. **Filtrado Jerárquico**:
   - Todos los endpoints filtran por `parent_id` para mostrar solo la red del agente
   - Query: `WHERE u.parent_id = ? OR u.id = ?`
   - Evita que agentes vean datos de otras redes

2. **Discriminación por Rol**:
   - Backend valida `req.user.role === 'superadmin'`
   - Agentes NO reciben datos de `is_gift`, `normal_cards`, `gift_cards`
   - Frontend adapta UI según respuesta del backend

3. **Autenticación**:
   - Ambos endpoints requieren token JWT válido
   - Header: `Authorization: Bearer <token>`

## Base de Datos

### Vistas Utilizadas

**v_superadmin_inventory** (SuperAdmin):
```sql
SELECT 
  user_id,
  room,
  SUM(CASE WHEN is_gift = 0 THEN 1 ELSE 0 END) as normal_cards,
  SUM(CASE WHEN is_gift = 1 THEN 1 ELSE 0 END) as gift_cards,
  COUNT(*) as total_cards,
  ROUND(SUM(CASE WHEN is_gift = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as free_percentage
FROM cards
WHERE status = 'available'
GROUP BY user_id, room;
```

**v_admin_inventory** (Agentes):
```sql
SELECT 
  user_id,
  room,
  COUNT(*) as total_cards
FROM cards
WHERE status = 'available'
GROUP BY user_id, room;
```

**card_movements_log**:
- Tabla con auditoría completa de movimientos
- Columna `is_gift` solo visible para SuperAdmin en queries

## Testing

### Escenarios de Prueba

1. **Login como Agente**:
   ```bash
   # Verificar que:
   - NO ve columna "Tipo" en historial
   - NO ve cards de normal/gift en inventarios
   - Solo ve totales
   - Filtro "Tipo de Cartón" NO aparece
   ```

2. **Login como SuperAdmin**:
   ```bash
   # Verificar que:
   - VE columna "Tipo" (💰/🎁) en historial
   - VE desglose pagos/gratis en inventarios
   - VE estadísticas completas (compliance_rate, alerts)
   - Filtro "Tipo de Cartón" SÍ aparece
   ```

3. **Filtros**:
   ```bash
   # Probar:
   - Búsqueda por usuario
   - Filtro por sala (bronce/plata/oro)
   - Filtro por tipo de movimiento
   - Rango de fechas
   - Solo alertas (SuperAdmin)
   - Tipo de cartón (SuperAdmin)
   ```

4. **Jerarquía**:
   ```bash
   # Crear agente1 con jugadores A, B, C
   # Crear agente2 con jugadores D, E, F
   # Login como agente1 → Solo ve A, B, C
   # Login como agente2 → Solo ve D, E, F
   # Login como SuperAdmin → Ve todos
   ```

### Comandos de Testing

```powershell
# Probar endpoint inventarios
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/cards/all-inventories" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Method Get

# Probar endpoint movimientos
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/cards/all-movements?limit=10&offset=0" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Method Get

# Con filtros
$params = @{
  room = "bronce"
  movement_type = "credit"
  date_from = "2025-12-01"
  limit = 50
}
$query = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join '&'
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/cards/all-movements?$query" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Method Get
```

## Rendimiento

### Optimizaciones

1. **Vistas Materializadas**:
   - `v_superadmin_inventory` y `v_admin_inventory` pre-calculan agregaciones
   - Evita JOINs complejos en tiempo real

2. **Paginación Backend**:
   - Historial usa LIMIT/OFFSET
   - Evita cargar miles de registros simultáneamente
   - Frontend puede solicitar 25, 50 o 100 por página

3. **Índices**:
   - `card_movements_log.user_id` (para filtrar por usuario)
   - `card_movements_log.room` (para filtrar por sala)
   - `card_movements_log.created_at` (para filtrar por fecha)
   - `cards.user_id`, `cards.room`, `cards.status` (para vistas)

4. **Lazy Loading Frontend**:
   - Solo carga datos al montar componente
   - Botón "Refrescar" para actualización manual
   - No polling automático (reduce carga servidor)

## Estructura de Archivos

```
24-kilates/
├── server/
│   └── src/
│       ├── controllers/
│       │   └── cardInventoryController.js   (MODIFICADO - +294 líneas)
│       └── routes/
│           ├── adminRoutes.js               (MODIFICADO - +2 rutas)
│           └── superAdminRoutes.js          (MODIFICADO - +1 ruta)
│
└── client-admin/
    └── src/
        ├── components/
        │   ├── AllInventoriesPanel.jsx        (NUEVO - 339 líneas)
        │   ├── CardMovementsHistory.jsx       (NUEVO - 439 líneas)
        │   └── Sidebar.jsx                    (MODIFICADO)
        └── pages/
            └── Dashboard.jsx                  (MODIFICADO)
```

## Checklist de Implementación

### Backend ✅
- [x] Crear `getAllInventories()` con lógica diferenciada
- [x] Crear `getAllMovements()` con filtros
- [x] Agregar rutas en `adminRoutes.js`
- [x] Agregar rutas en `superAdminRoutes.js`
- [x] Validar permisos por rol
- [x] Implementar filtrado jerárquico (parent_id)
- [x] Manejar paginación
- [x] Agregar estadísticas calculadas

### Frontend ✅
- [x] Crear componente `AllInventoriesPanel`
- [x] Crear componente `CardMovementsHistory`
- [x] Integrar en Dashboard
- [x] Actualizar Sidebar con nuevas secciones
- [x] Implementar filtros en UI
- [x] Adaptar UI según rol (conditional rendering)
- [x] Agregar paginación en historial
- [x] Aplicar tema oscuro consistente
- [x] Agregar iconos y badges

### Testing ⏳
- [ ] Probar como agente → verificar NO ve is_gift
- [ ] Probar como SuperAdmin → verificar SÍ ve is_gift
- [ ] Probar filtros de búsqueda
- [ ] Probar paginación
- [ ] Probar jerarquía (solo ver su red)
- [ ] Verificar rendimiento con 100+ usuarios

### Documentación ✅
- [x] Crear este documento de resumen
- [x] Documentar endpoints API
- [x] Documentar componentes React
- [x] Agregar ejemplos de uso

## Próximos Pasos

1. **Testing Completo**:
   - Crear usuarios de prueba en diferentes jerarquías
   - Verificar todos los filtros funcionan correctamente
   - Probar paginación con grandes volúmenes de datos

2. **Refinamientos UX**:
   - Agregar tooltips explicativos
   - Mejorar mensajes de error
   - Agregar confirmaciones para acciones críticas

3. **Optimizaciones**:
   - Considerar cache Redis para vistas frecuentes
   - Implementar WebSocket para actualizaciones en tiempo real
   - Agregar exportación a CSV/Excel

4. **Monitoreo**:
   - Agregar logs de auditoría para acciones de SuperAdmin
   - Dashboard de métricas de uso
   - Alertas automáticas cuando usuarios excedan 20% gratis

## Notas de Implementación

- **Regla 10%**: Los paneles reflejan el cumplimiento de la regla implementada previamente (máximo 10% de cartones gratis)
- **Compatibilidad**: Se mantuvo compatibilidad con el panel antiguo (`card-inventory`) por si se necesita acceso directo
- **Modo Flexible**: La implementación respeta el modo flexible de la regla 10% (usar todos los pagos disponibles + completar con gratis si necesario)
- **Tema Oscuro**: Todos los componentes usan la paleta de colores del admin (gradientes purple/blue, borders semitransparentes)

---

**Autor**: GitHub Copilot
**Fecha**: 17 de Diciembre 2025
**Versión**: 1.0
