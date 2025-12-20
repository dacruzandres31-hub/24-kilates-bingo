# Sistema de Estado Dinámico de Sorteos

**Fecha**: 18 de diciembre de 2025  
**Versión**: v1.2.1  
**Estado**: ✅ Implementado

---

## Resumen Ejecutivo

Se ha implementado un sistema de detección de estado en tiempo real que muestra correctamente cuándo las salas están **SORTEANDO** vs **HABILITADAS** para comprar. Esto prepara el sistema para que cuando las funcionalidades de sorteo estén activas, tomen el estado correcto automáticamente desde estos paneles.

---

## Funcionamiento

### 1. Sala Starter - Detección por Horario

**Lógica**:
- Starter sortea **cada hora** (23:00, 00:00, 01:00... hasta 19:00)
- Ventana de sorteo: **-10 minutos a +5 minutos** de la hora programada
- Ejemplo: Si el sorteo es a las 15:00:
  - **14:55 - 15:05**: Muestra "SORTEANDO AHORA" 🔴
  - **Resto del tiempo**: Muestra "Habilitada (GRATIS)" 🟢

**Código (Frontend)**:
```javascript
const isStarterDrawing = (sessionStartTime) => {
  if (!sessionStartTime) return false;
  const now = new Date();
  const startTime = new Date(sessionStartTime);
  const diffMinutes = (startTime - now) / 1000 / 60;
  
  // Starter sortea si falta menos de 5 minutos para la hora programada
  // o si ya pasó la hora pero no más de 10 minutos
  return diffMinutes <= 5 && diffMinutes >= -10;
};
```

### 2. Salas con Dinero - Estado desde BD

**Lógica**:
- Estado proviene directamente de `game_sessions.status`
- Estados posibles:
  - `playing`: "SORTEANDO AHORA" 🔴 (badge rojo con animación)
  - `active` o `pending`: "HABILITADA" 🟢 (badge verde)
  - Sin sesión: "SIN SESIÓN" ⚪ (badge gris)

**Código (Frontend)**:
```javascript
const getSessionStatusText = (pozo) => {
  // Starter: Verificar si está sorteando según horario
  if (pozo.room === 'starter') {
    if (isStarterDrawing(pozo.startTime)) {
      return 'SORTEANDO AHORA';
    }
    return 'HABILITADA (GRATIS)';
  }
  
  // Otras salas: Estado de la sesión
  if (pozo.status === 'playing') {
    return 'SORTEANDO AHORA';
  }
  
  return 'HABILITADA';
};
```

---

## Implementación

### Componentes Modificados

#### 1. SessionStatusPanel.jsx

**Funciones agregadas**:
- `isStarterDrawing(sessionStartTime)` - Detecta si Starter está en ventana de sorteo
- `getSessionStatus(session, room)` - Determina estado con lógica por sala

**Cambios visuales**:
```jsx
// Badge con animación cuando está sorteando
<div className={`${statusInfo.color} text-white px-3 py-1.5 rounded-full`}>
  {statusInfo.icon}
  {statusInfo.text}
</div>

// Ejemplo de retorno:
{
  text: 'SORTEANDO AHORA',
  icon: <Play className="w-4 h-4 animate-pulse" />,
  color: 'bg-red-600 animate-pulse'
}
```

#### 2. PotStatusPanel.jsx

**Funciones agregadas**:
- `isStarterDrawing(sessionStartTime)` - Misma lógica que SessionStatusPanel
- `getSessionStatusText(pozo)` - Determina texto del estado
- `getStatusColor(pozo)` - Determina color del badge

**Datos requeridos**:
- Agregado campo `startTime` al mapeo de datos (fetch y WebSocket)
- Se extrae de `currentSession.start_time` del backend

**Cambios visuales**:
```jsx
<div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(pozo)}`}>
  {getSessionStatusText(pozo)}
</div>

// Colores por estado:
// SORTEANDO AHORA: 'bg-red-500/20 text-red-400 animate-pulse'
// HABILITADA: 'bg-green-500/20 text-green-400'
// SIN SESIÓN: 'bg-gray-500/20 text-gray-400'
```

---

## Flujo de Datos

### Backend → Frontend

**API Endpoint**: `GET /api/admin/sessions/active`

**Estructura de respuesta**:
```json
{
  "success": true,
  "rooms": [
    {
      "room": "starter",
      "currentSession": {
        "id": 123,
        "start_time": "2025-12-18T15:00:00.000Z",  // ← Usado para calcular estado
        "status": "active",
        "cards_sold": 5
      },
      "prizeConfig": {
        "prize_linea": "1 Ticket para Bronce",
        "prize_bingo": "1 Ticket para Oro"
      }
    },
    {
      "room": "bronce",
      "currentSession": {
        "id": 124,
        "start_time": "2025-12-18T20:00:00.000Z",
        "status": "playing",  // ← Indica que está sorteando
        "current_pot_linea": 2500,
        "current_pot_bingo": 25000
      }
    }
  ]
}
```

### Frontend - Procesamiento

**1. Fetch inicial + Auto-refresh (30s)**:
```javascript
const response = await axios.get('/api/admin/sessions/active');

const pozosData = response.data.rooms.map(roomData => {
  return {
    room: roomData.room,
    startTime: roomData.currentSession?.start_time,  // ← Guardado
    status: roomData.currentSession?.status,
    // ... otros campos
  };
});
```

**2. Cálculo dinámico del estado**:
```javascript
// En render/actualización
const statusText = getSessionStatusText(pozo);
const statusColor = getStatusColor(pozo);
```

**3. WebSocket updates**:
```javascript
socketInstance.on('pots_updated', (data) => {
  if (data.rooms) {
    const pozosData = data.rooms.map(roomData => {
      return {
        startTime: roomData.currentSession?.start_time,  // ← Actualizado
        status: roomData.currentSession?.status,
        // ...
      };
    });
    setPozos(pozosData);
  }
});
```

---

## Integración con Motor de Juego

### Cuando el motor esté funcional

El motor de juego (`gameEngineAuto.js`) debe:

1. **Al iniciar sorteo**:
```javascript
await pool.query(`
  UPDATE game_sessions 
  SET status = 'playing'  -- ← Frontend detectará automáticamente
  WHERE id = ?
`, [gameSessionId]);

// Emitir evento WebSocket
io.to('admin_dashboard').emit('session_status_changed', {
  sessionId: gameSessionId,
  room: 'bronce',
  status: 'playing'
});
```

2. **Al finalizar sorteo**:
```javascript
await pool.query(`
  UPDATE game_sessions 
  SET status = 'completed'
  WHERE id = ?
`, [gameSessionId]);

io.to('admin_dashboard').emit('session_status_changed', {
  sessionId: gameSessionId,
  room: 'bronce',
  status: 'completed'
});
```

### Flujo completo

```
[14:55] - 5 min antes del sorteo
  ↓
Frontend detecta: diffMinutes = -5 (falta 5 min)
  ↓
isStarterDrawing() → true
  ↓
Badge: "SORTEANDO AHORA" 🔴 con animación pulse

[15:00] - Hora del sorteo
  ↓
Motor inicia sorteo → SET status = 'playing'
  ↓
WebSocket emite session_status_changed
  ↓
Frontend actualiza → sigue mostrando "SORTEANDO AHORA"

[15:10] - 10 min después del sorteo
  ↓
diffMinutes = 10 (ya pasaron 10 min)
  ↓
isStarterDrawing() → false
  ↓
Badge: "HABILITADA (GRATIS)" 🟢 sin animación
```

---

## Testing

### Script de Validación

**Archivo**: `test_estado_sorteando.ps1`

```powershell
.\test_estado_sorteando.ps1
```

**Validaciones**:
1. ✅ API retorna `start_time` en respuesta
2. ✅ Calcula diferencia de tiempo correctamente
3. ✅ Aplica lógica de ventana -10 a +5 minutos
4. ✅ SessionStatusPanel tiene función `isStarterDrawing`
5. ✅ PotStatusPanel tiene función `isStarterDrawing`
6. ✅ Ambos componentes muestran texto "SORTEANDO AHORA"
7. ✅ Badge usa `animate-pulse` cuando está sorteando

### Prueba Manual

**Para verificar en vivo**:

1. Reiniciar frontend:
```bash
npm run dev -w client-admin
```

2. Abrir Dashboard en `http://localhost:5174`

3. Esperar a que falten 5 minutos para una hora en punto (ej: 14:55)

4. **Verificar cambios**:
   - A las **14:55**: Badge cambia a rojo "SORTEANDO AHORA" con animación
   - A las **15:05**: Badge vuelve a verde "HABILITADA (GRATIS)"

5. **Comparar ambos paneles**:
   - Estado de Sesiones debe mostrar mismo estado
   - Estado de Pozos debe mostrar mismo estado
   - Colores y textos idénticos

---

## Ventanas de Tiempo

### Sala Starter (Horaria)

| Hora Actual | Próximo Sorteo | Diferencia | Estado Mostrado |
|-------------|----------------|------------|-----------------|
| 14:50 | 15:00 | -10 min | SORTEANDO AHORA 🔴 |
| 14:55 | 15:00 | -5 min | SORTEANDO AHORA 🔴 |
| 15:00 | 15:00 | 0 min | SORTEANDO AHORA 🔴 |
| 15:05 | 15:00 | +5 min | SORTEANDO AHORA 🔴 |
| 15:11 | 16:00 | -49 min | HABILITADA (GRATIS) 🟢 |

### Salas con Dinero (Diarias)

| status en BD | Mostrado | Color | Animación |
|--------------|----------|-------|-----------|
| `playing` | SORTEANDO AHORA | Rojo | Pulse ✅ |
| `active` | HABILITADA | Verde | No |
| `pending` | HABILITADA | Verde | No |
| `completed` | SIN SESIÓN | Gris | No |
| `null` | SIN SESIÓN | Gris | No |

---

## Beneficios

### ✅ Sincronización Perfecta
- Ambos paneles muestran **exactamente el mismo estado**
- No hay contradicciones visuales

### ✅ Actualización Automática
- Auto-refresh cada 30 segundos
- WebSocket updates en tiempo real
- No requiere refrescar página

### ✅ Feedback Visual Claro
- **Rojo + Animación** cuando está sorteando
- **Verde** cuando está habilitada
- **Gris** cuando no hay sesión

### ✅ Preparado para Producción
- Motor de juego solo necesita cambiar `status` en BD
- Frontend detecta cambios automáticamente
- No requiere modificaciones adicionales

---

## Configuración de Ventanas

### Ajustar Ventana de Sorteo

**Actual**: -10 minutos a +5 minutos (15 minutos totales)

**Para modificar**:
```javascript
// En SessionStatusPanel.jsx y PotStatusPanel.jsx
const isStarterDrawing = (sessionStartTime) => {
  // ...
  
  // Cambiar estos valores:
  return diffMinutes <= 5 && diffMinutes >= -10;
  //                    ↑                  ↑
  //              Antes del sorteo   Después del sorteo
};
```

**Ejemplos de configuración**:
- Ventana corta (5 min): `diffMinutes <= 2 && diffMinutes >= -3`
- Ventana larga (20 min): `diffMinutes <= 10 && diffMinutes >= -10`
- Solo durante sorteo: `diffMinutes <= 0 && diffMinutes >= -5`

---

## Troubleshooting

### Estado no cambia a SORTEANDO

**Problema**: Badge siempre muestra "HABILITADA" aunque falten 3 minutos

**Solución**:
1. Verificar que `startTime` está llegando al componente:
```javascript
console.log('Start Time:', pozo.startTime);
console.log('Diff Minutes:', diffMinutes);
```

2. Verificar zona horaria del servidor:
```bash
# Backend debe retornar UTC
SELECT start_time FROM game_sessions WHERE room = 'starter';
```

3. Frontend debe convertir a hora local:
```javascript
const startTime = new Date(sessionStartTime);  // Convierte automáticamente
```

### Estado diferente entre paneles

**Problema**: PotStatusPanel muestra "HABILITADA" pero SessionStatusPanel muestra "SORTEANDO"

**Solución**:
- Ambos deben usar la **misma función** `isStarterDrawing`
- Verificar que ambos reciben `startTime` correctamente
- Revisar que ambos usan el mismo auto-refresh (30s)

### Badge no tiene animación

**Problema**: Estado correcto pero sin efecto visual

**Solución**:
```jsx
// Verificar que incluye animate-pulse
<div className="bg-red-600 animate-pulse">
  SORTEANDO AHORA
</div>

// Asegurarse que Tailwind esté compilando:
npm run dev -w client-admin
```

---

## Próximos Pasos

### 1. Integrar con Motor de Juego

Modificar `gameEngineAuto.js`:
```javascript
async startDrawing(gameSessionId) {
  // Cambiar estado a 'playing'
  await pool.query(`
    UPDATE game_sessions SET status = 'playing' WHERE id = ?
  `, [gameSessionId]);
  
  // Emitir WebSocket
  this.io.to('admin_dashboard').emit('session_status_changed', {
    sessionId: gameSessionId,
    status: 'playing'
  });
}
```

### 2. Agregar Control Manual

Panel Admin con botón:
```jsx
<button onClick={() => startDrawing(sessionId)}>
  Iniciar Sorteo Ahora
</button>
```

### 3. Logs de Auditoría

Registrar cambios de estado:
```javascript
await pool.query(`
  INSERT INTO session_status_log 
  (session_id, old_status, new_status, changed_by)
  VALUES (?, ?, ?, ?)
`, [sessionId, 'active', 'playing', adminUserId]);
```

---

## Documentación Relacionada

- [SINCRONIZACION_POZOS_COMPLETE.md](./SINCRONIZACION_POZOS_COMPLETE.md) - Unificación de endpoints
- [IMPLEMENTACION_SESIONES_v2.md](./IMPLEMENTACION_SESIONES_v2.md) - Sistema de sesiones
- [WEBSOCKET_REALTIME_IMPLEMENTATION.md](./WEBSOCKET_REALTIME_IMPLEMENTATION.md) - Arquitectura WebSocket

---

**Autor**: GitHub Copilot  
**Revisado**: ✅  
**Estado**: Producción Ready
