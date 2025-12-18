# Sistema de Configuración de Salas y Pozos - Documentación Completa

## 📋 Resumen

Sistema completo para gestionar precios de cartones y distribución automática de pozos por sala (Bronce, Plata, Oro), con cálculo automático basado en cartones vendidos y panel de configuración para SuperAdmin.

**Commit**: 1691b03  
**Fecha**: 17 de Diciembre 2025  
**Estado**: ✅ Listo para aplicar migración

---

## 🎯 Funcionalidades Implementadas

### 1. Configuración por Sala

Cada sala (Bronce, Plata, Oro) tiene:
- **Precio del cartón**: Configurable por SuperAdmin
- **Porcentajes de distribución**:
  - LÍNEA: 15% (default)
  - BINGO: 50% (default)
  - Acumulado Pre-40: 5% (default)
  - Casa: 30% (automático, es el resto)
- **Pozo acumulado Pre-40**: Se incrementa entre sorteos

### 2. Cálculo Automático de Pozos

**Fórmula**:
```
Total Ingresos = Cartones Vendidos × Precio del Cartón

Pozo LÍNEA = Total Ingresos × (percentage_linea / 100)
Pozo BINGO = Total Ingresos × (percentage_bingo / 100)
Pozo Pre-40 = Total Ingresos × (percentage_acumulado / 100)

Pozo Acumulado Total = Pozo Acumulado Sala + Pozo Pre-40 del sorteo actual
```

**Ejemplo** (Sala Bronce):
- Precio cartón: $5,000
- Cartones vendidos: 100
- Total ingresos: $500,000

| Pozo | Porcentaje | Monto |
|------|-----------|-------|
| LÍNEA | 15% | $75,000 |
| BINGO | 50% | $250,000 |
| Pre-40 | 5% | $25,000 |
| Casa | 30% | $150,000 |

### 3. Comportamiento de Pozos

**LÍNEA y BINGO**:
- Se calculan al inicio del sorteo
- Se entregan a los ganadores
- Después del sorteo: **Resetean a $0**

**Pozo Acumulado Pre-40**:
- Se incrementa con cada sorteo
- **NO se resetea** (persiste entre sorteos)
- Solo se entrega si hay BINGO **antes de la bola 40**
- Si no se gana, se acumula para el siguiente sorteo

---

## 🗄️ Base de Datos

### Tabla: `room_settings`

```sql
CREATE TABLE room_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room ENUM('bronce', 'plata', 'oro') NOT NULL UNIQUE,
    card_price DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
    
    -- Porcentajes de distribución
    percentage_linea DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    percentage_bingo DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    percentage_acumulado DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    
    -- Pozo acumulado (persiste entre sorteos)
    accumulated_pot_pre40 DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

**Valores Iniciales**:
| Sala | Precio Cartón | LÍNEA | BINGO | Pre-40 | Acumulado |
|------|--------------|-------|-------|--------|-----------|
| Bronce | $5,000 | 15% | 50% | 5% | $0 |
| Plata | $10,000 | 15% | 50% | 5% | $0 |
| Oro | $20,000 | 15% | 50% | 5% | $0 |

### Procedures

**1. `calculate_session_pots(p_session_id)`**
```sql
-- Calcula pozos automáticamente basado en cartones vendidos
-- Actualiza current_pot_linea, current_pot_bingo, current_pot_jackpot
-- Incrementa accumulated_pot_pre40 en room_settings
```

**2. `reset_session_pots_after_draw(p_session_id)`**
```sql
-- Resetea pozos LÍNEA y BINGO a 0 después del sorteo
-- Marca sesión como 'completed'
-- El pozo acumulado NO se resetea (está en room_settings)
```

### Trigger

**`update_pots_on_card_sale`**
```sql
-- Se ejecuta AFTER UPDATE en game_sessions
-- Si cambia total_cards_sold, recalcula pozos automáticamente
```

---

## 🔧 Backend API

### Endpoints SuperAdmin

**1. GET `/api/superadmin/room-settings`**
```javascript
// Obtener configuración de todas las salas
Response: {
  success: true,
  settings: [
    {
      room: 'bronce',
      card_price: 5000.00,
      percentage_linea: 15.00,
      percentage_bingo: 50.00,
      percentage_acumulado: 5.00,
      accumulated_pot_pre40: 125000.00,
      updated_at: '2025-12-17T...'
    },
    // ...
  ]
}
```

**2. PUT `/api/superadmin/room-settings/:room`**
```javascript
// Actualizar precio de cartón
Body: { card_price: 7500 }
Response: {
  success: true,
  message: 'Precio de sala bronce actualizado correctamente',
  setting: { ... }
}
```

**3. PUT `/api/superadmin/room-settings/:room/percentages`**
```javascript
// Actualizar porcentajes de distribución
Body: {
  percentage_linea: 20.00,
  percentage_bingo: 50.00,
  percentage_acumulado: 10.00
}
// Validación: Suma no puede superar 100%
Response: {
  success: true,
  message: 'Porcentajes actualizados correctamente'
}
```

**4. POST `/api/superadmin/room-settings/:room/reset-accumulated`**
```javascript
// Resetear pozo acumulado Pre-40 a $0
Response: {
  success: true,
  message: 'Pozo acumulado de bronce reseteado a $0'
}
```

### Endpoints Admin (Consulta)

**GET `/api/admin/room-settings/current-pots`**
```javascript
// Obtener pozos actuales de todas las salas
Response: {
  success: true,
  pots: [
    {
      room: 'bronce',
      card_price: 5000.00,
      jackpot: 125000.00,           // Pozo acumulado
      current_pot_linea: 75000.00,   // Pozo actual LÍNEA
      current_pot_bingo: 250000.00,  // Pozo actual BINGO
      cards_sold: 100,
      status: 'active',
      session_id: 42
    },
    // ...
  ]
}
```

---

## 🎨 Frontend

### Componente: `RoomConfigPanel.jsx` (SuperAdmin Only)

**Ubicación**: Panel Admin → Sesiones y Pozos → Configuración de Salas

**Features**:
- **Ver configuración** de las 3 salas (cards con tema por sala)
- **Editar precio** de cartón por sala
- **Editar porcentajes** de distribución (LÍNEA, BINGO, Pre-40)
- **Ver pozo acumulado** Pre-40 actual
- **Resetear pozo acumulado** con confirmación
- **Validación**: Porcentajes no pueden sumar más de 100%
- **Indicador**: Muestra porcentaje de la casa automáticamente

**Diseño**:
```jsx
<RoomConfigPanel>
  ├─ Header: "Configuración de Salas y Pozos" + Botón Actualizar
  ├─ Grid 3 columnas (Bronce, Plata, Oro)
  │   └─ Sala Card:
  │       ├─ Header: Icono + Nombre + Botón Editar
  │       ├─ Vista lectura:
  │       │   ├─ Precio cartón ($5,000)
  │       │   ├─ Distribución pozos (15% / 50% / 5% / 30%)
  │       │   ├─ Pozo acumulado ($125,000)
  │       │   └─ Botón resetear
  │       └─ Formulario edición:
  │           ├─ Input precio cartón
  │           ├─ Inputs porcentajes (LÍNEA, BINGO, Pre-40)
  │           ├─ Indicador total + casa
  │           └─ Botón Guardar
  └─ Panel informativo: "Cómo funciona el sistema de pozos"
```

### Componente: `PotStatusPanel.jsx` (Actualizado)

**Cambios**:
- Ahora consulta `/api/admin/room-settings/current-pots`
- Muestra **todas las salas** (incluso sin sesión activa)
- Añadido: Cartones vendidos y precio cartón
- Badge estado: `EN JUEGO` | `ACTIVA` | `SIN SESIÓN`
- Pozos renombrados:
  - JACKPOT → **Pozo Acumulado Pre-40**
  - LÍNEA → **Pozo LÍNEA**
  - BINGO → **Pozo BINGO**

---

## 📝 Instalación y Configuración

### 1. Aplicar Migración SQL

```powershell
# Ejecutar script de migración
.\aplicar_room_settings_migration.ps1
```

**Script hace**:
1. Verifica que existe MySQL y el archivo de migración
2. Crea tabla `room_settings`
3. Inserta configuración inicial (3 salas)
4. Crea procedures `calculate_session_pots` y `reset_session_pots_after_draw`
5. Crea trigger `update_pots_on_card_sale`
6. Verifica la instalación
7. Muestra configuración inicial

**Salida esperada**:
```
✅ MIGRACIÓN APLICADA EXITOSAMENTE

Tabla room_settings: 1
Salas configuradas: 3
Procedures creados: 2

Configuración inicial de salas:
+--------+--------------+-------+-------+-------+----------------+
| Sala   | Precio_Carton| LINEA | BINGO | Pre_40| Pozo_Acumulado |
+--------+--------------+-------+-------+-------+----------------+
| bronce | $5,000       | 15%   | 50%   | 5%    | $0             |
| plata  | $10,000      | 15%   | 50%   | 5%    | $0             |
| oro    | $20,000      | 15%   | 50%   | 5%    | $0             |
+--------+--------------+-------+-------+-------+----------------+
```

### 2. Reiniciar Servidor Backend

```powershell
# Nodemon detectará los cambios automáticamente
# O reiniciar manualmente:
cd "c:\Users\User\Documents\24 kilates"
npm run dev -w server
```

### 3. Acceder al Panel Admin

1. Login como SuperAdmin (Andy)
2. Ir a **Sesiones y Pozos** en el sidebar
3. Seleccionar **Configuración de Salas**
4. Ajustar precios y porcentajes según necesidad

---

## 🧪 Testing Manual

### Escenario 1: Configurar Precio de Sala

1. Login SuperAdmin
2. Panel Admin → Configuración de Salas
3. Click "Editar" en sala Bronce
4. Cambiar precio a $7,500
5. Click "Guardar Cambios"
6. **Verificar**: Precio actualizado en card
7. **Verificar DB**:
```sql
SELECT room, card_price FROM room_settings WHERE room = 'bronce';
-- Debe mostrar: bronce | 7500.00
```

### Escenario 2: Actualizar Porcentajes

1. Panel Admin → Configuración de Salas
2. Click "Editar" en sala Plata
3. Cambiar:
   - LÍNEA: 20%
   - BINGO: 55%
   - Pre-40: 10%
4. Click "Guardar Cambios"
5. **Verificar**: Total = 85%, Casa = 15%
6. **Verificar DB**:
```sql
SELECT percentage_linea, percentage_bingo, percentage_acumulado 
FROM room_settings WHERE room = 'plata';
-- Debe mostrar: 20.00 | 55.00 | 10.00
```

### Escenario 3: Cálculo Automático de Pozos

**Setup**:
```sql
-- Crear sesión de prueba
INSERT INTO game_sessions (room, status, total_cards_sold) 
VALUES ('bronce', 'active', 0);

SET @session_id = LAST_INSERT_ID();
```

**Test**:
```sql
-- Simular venta de 50 cartones
UPDATE game_sessions 
SET total_cards_sold = 50 
WHERE id = @session_id;

-- El trigger llamará automáticamente a calculate_session_pots()

-- Verificar pozos calculados
SELECT 
    current_pot_linea,
    current_pot_bingo,
    current_pot_jackpot,
    total_revenue
FROM game_sessions 
WHERE id = @session_id;

-- Esperado (precio bronce = $5,000):
-- Total ingresos = 50 × $5,000 = $250,000
-- LÍNEA: $250,000 × 15% = $37,500
-- BINGO: $250,000 × 50% = $125,000
-- Pre-40: $250,000 × 5% = $12,500
```

### Escenario 4: Acumulación de Pozo Pre-40

```sql
-- Verificar pozo acumulado inicial
SELECT accumulated_pot_pre40 FROM room_settings WHERE room = 'bronce';
-- Esperado: 0.00

-- Ejecutar procedure de cálculo (se llama automáticamente por trigger)
CALL calculate_session_pots(@session_id);

-- Verificar que se incrementó
SELECT accumulated_pot_pre40 FROM room_settings WHERE room = 'bronce';
-- Esperado: 12,500.00 (5% de $250,000)

-- Simular otra sesión con 30 cartones
INSERT INTO game_sessions (room, status, total_cards_sold) 
VALUES ('bronce', 'active', 30);

SET @session_id2 = LAST_INSERT_ID();
CALL calculate_session_pots(@session_id2);

-- Verificar acumulación
SELECT accumulated_pot_pre40 FROM room_settings WHERE room = 'bronce';
-- Esperado: 12,500 + (30 × 5,000 × 5%) = 12,500 + 7,500 = 20,000.00
```

### Escenario 5: Resetear Pozo Acumulado

1. Panel Admin → Configuración de Salas
2. Sala Bronce → Click "🔄 Resetear a $0"
3. Confirmar acción
4. **Verificar**: Pozo acumulado = $0
5. **Verificar DB**:
```sql
SELECT accumulated_pot_pre40 FROM room_settings WHERE room = 'bronce';
-- Debe mostrar: 0.00
```

### Escenario 6: Validación de Porcentajes

1. Panel Admin → Configuración de Salas
2. Click "Editar" en sala Oro
3. Cambiar:
   - LÍNEA: 50%
   - BINGO: 60%
   - Pre-40: 10%
4. Click "Guardar Cambios"
5. **Verificar**: Alert "Los porcentajes suman 120%, no pueden superar 100%"
6. **Verificar**: No se guarda (rollback)

---

## 🔒 Seguridad y Permisos

### Rutas SuperAdmin Only

```javascript
// superAdminRoutes.js
router.use(authenticateToken);       // JWT válido
router.use(isAdmin);                 // Rol admin/superadmin
router.use(requireSuperAdmin);       // Solo superadmin

// Endpoints protegidos:
PUT /api/superadmin/room-settings/:room
PUT /api/superadmin/room-settings/:room/percentages
POST /api/superadmin/room-settings/:room/reset-accumulated
```

### Rutas Admin (Consulta)

```javascript
// adminRoutes.js
router.use(authenticateToken);       // JWT válido
router.use(isAdmin);                 // Rol admin/superadmin

// Endpoint accesible para Agentes:
GET /api/admin/room-settings/current-pots
```

### Frontend Protection

```jsx
// Dashboard.jsx
{activeSections['room-config'] && (
  <SuperAdminOnly>
    <RoomConfigPanel />
  </SuperAdminOnly>
)}

// Sidebar.jsx
{ id: 'room-config', name: 'Configuración de Salas', superAdminOnly: true }
```

**Comportamiento**:
- **Agentes**: NO ven la opción "Configuración de Salas" en el sidebar
- **SuperAdmin**: Ven y pueden acceder a todas las funciones

---

## 📊 Casos de Uso

### Caso 1: Aumentar Premio de Sala Oro

**Situación**: Se quiere hacer más atractiva la sala Oro aumentando los premios.

**Acción**:
1. Login SuperAdmin
2. Panel Admin → Configuración de Salas → Sala Oro
3. Click "Editar"
4. Cambiar porcentajes:
   - LÍNEA: 20% (antes 15%)
   - BINGO: 60% (antes 50%)
   - Pre-40: 5% (igual)
5. Guardar

**Resultado**:
- Casa pasa de 30% a 15%
- Premios aumentan significativamente
- Cambio afecta solo a **nuevas sesiones** (las activas mantienen pozos calculados)

### Caso 2: Promoción "Doble Jackpot"

**Situación**: Evento especial con jackpot acumulado duplicado.

**Acción**:
1. Ajustar porcentaje Pre-40 de 5% a 10%
2. Ejecutar varios sorteos para acumular rápido
3. Al finalizar promoción, volver a 5%

### Caso 3: Resetear Jackpot Ganado

**Situación**: Jugador ganó el jackpot de $5,000,000 en sala Bronce.

**Acción**:
1. El sistema automáticamente entregó el premio
2. SuperAdmin va a Configuración de Salas
3. Click "🔄 Resetear a $0" en sala Bronce
4. Confirmar
5. El pozo acumulado vuelve a $0 y empieza a acumularse nuevamente

### Caso 4: Cambio de Precio por Sala

**Situación**: Inflación, necesidad de ajustar precios.

**Acción**:
1. Sala Bronce: $5,000 → $6,000
2. Sala Plata: $10,000 → $12,000
3. Sala Oro: $20,000 → $25,000

**Resultado**:
- Pozos automáticamente se recalculan con nuevos precios
- Ingresos por sesión aumentan proporcionalmente

---

## 🐛 Troubleshooting

### Error: "Los porcentajes suman más de 100%"

**Causa**: Suma de percentage_linea + percentage_bingo + percentage_acumulado > 100

**Solución**: Ajustar porcentajes para que sumen máximo 100%

### Pozos no se actualizan al vender cartones

**Causa**: Trigger no está funcionando o sesión no existe

**Verificar**:
```sql
-- Ver triggers activos
SHOW TRIGGERS LIKE 'game_sessions';

-- Verificar que existe el trigger
SELECT * FROM information_schema.TRIGGERS 
WHERE TRIGGER_NAME = 'update_pots_on_card_sale';

-- Ejecutar manualmente
CALL calculate_session_pots(SESSION_ID);
```

### Pozo acumulado no se resetea después de ganar

**Acción**: Es correcto, el pozo NO se resetea automáticamente.

**Para resetear**:
1. SuperAdmin → Configuración de Salas
2. Click "🔄 Resetear a $0"
3. O ejecutar SQL:
```sql
UPDATE room_settings 
SET accumulated_pot_pre40 = 0.00 
WHERE room = 'bronce';
```

### Panel "Configuración de Salas" no aparece para SuperAdmin

**Verificar**:
1. Token JWT tiene role = 'superadmin'
2. Sidebar.jsx filtra correctamente `superAdminOnly`
3. Dashboard.jsx usa wrapper `<SuperAdminOnly>`

**Debug**:
```javascript
// Sidebar.jsx
console.log('User role:', userRole);

// RoomConfigPanel.jsx
useEffect(() => {
  const token = localStorage.getItem('adminToken');
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
}, []);
```

---

## 📈 Próximas Mejoras

### 1. Historial de Cambios

Registrar cambios en configuración:

```sql
CREATE TABLE room_settings_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room VARCHAR(50),
    field_changed VARCHAR(50),
    old_value VARCHAR(100),
    new_value VARCHAR(100),
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);
```

### 2. Programación de Cambios

Permitir programar cambios de precio/porcentajes:

```sql
CREATE TABLE scheduled_settings_changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room VARCHAR(50),
    execute_at DATETIME,
    card_price DECIMAL(10,2),
    status ENUM('pending', 'executed', 'cancelled')
);
```

### 3. Alertas de Pozos

Notificar cuando pozo acumulado supera cierto monto:

```javascript
// En calculate_session_pots procedure
IF v_accumulated_pot >= 10000000 THEN
    -- Enviar notificación a SuperAdmin
    INSERT INTO admin_notifications (type, message, priority) 
    VALUES ('jackpot_alert', 'Pozo Pre-40 Bronce superó $10M', 'high');
END IF;
```

### 4. Análisis de Rentabilidad

Dashboard con métricas por sala:

- Ingresos totales vs premios entregados
- Porcentaje real de ganancia de la casa
- ROI por sala
- Tendencias de pozos acumulados

---

## ✅ Checklist de Implementación

- [x] Migración SQL creada
- [x] Tabla room_settings con 3 salas
- [x] Procedure calculate_session_pots
- [x] Procedure reset_session_pots_after_draw
- [x] Trigger update_pots_on_card_sale
- [x] Controller roomSettingsController.js
- [x] Rutas SuperAdmin configuradas
- [x] Rutas Admin configuradas
- [x] Componente RoomConfigPanel.jsx
- [x] PotStatusPanel.jsx actualizado
- [x] Sidebar actualizado
- [x] Dashboard integrado
- [x] Script aplicar_room_settings_migration.ps1
- [x] Validaciones frontend
- [x] Protección SuperAdminOnly
- [x] Documentación completa
- [ ] Migración aplicada en BD
- [ ] Testing manual completado
- [ ] Producción ready

---

## 📚 Referencias

- Tabla `game_sessions`: Ver [schema_completo_mysql.sql](../../server/schema_completo_mysql.sql)
- Lógica de cascada de jackpot: Ver [PUNTOS_CRITICOS_PRODUCCION.md](../../PUNTOS_CRITICOS_PRODUCCION.md)
- Panel de sesiones: Ver [SESIONES_POZOS_IMPLEMENTATION.md](../../SESIONES_POZOS_IMPLEMENTATION.md)

---

**Implementado por**: GitHub Copilot  
**Fecha**: 17 de Diciembre 2025  
**Versión**: 1.6.0  
**Estado**: ⏳ Pendiente aplicar migración SQL
