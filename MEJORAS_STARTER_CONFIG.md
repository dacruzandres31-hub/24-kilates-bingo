# Mejoras en Configuración de Sala Starter

## Fecha: 21 de diciembre de 2025

## Problema Identificado

1. **Configuración limitada**: La sala Starter solo permitía configurar cantidad de tickets, sin especificar para qué sala eran válidos
2. **Cambios no persistentes**: Los cambios de cantidad de tickets no se guardaban correctamente
3. **Lobby sin información real**: El lobby del jugador mostraba solo íconos genéricos en vez de mostrar los premios reales de Starter

## Solución Implementada

### 1. Base de Datos

**Archivo**: `server/STARTER_TICKET_ROOM_MIGRATION.sql`

- Agregadas columnas `ticket_room_linea` y `ticket_room_bingo` (ENUM: 'bronce', 'plata', 'oro')
- Valores por defecto: Línea = 'bronce', Bingo = 'oro'
- Vista `v_starter_config` actualizada para incluir nuevos campos

```sql
ALTER TABLE starter_room_config
  ADD COLUMN ticket_room_linea ENUM('bronce', 'plata', 'oro') DEFAULT 'bronce',
  ADD COLUMN ticket_room_bingo ENUM('bronce', 'plata', 'oro') DEFAULT 'oro';
```

### 2. Backend

**Archivos modificados**:
- `server/src/controllers/starterConfigController.js`
- `server/src/controllers/roomSettingsController.js`

#### starterConfigController.js

**Cambios en `updateStarterPrizes`**:
- Acepta parámetros: `prizes_linea`, `ticket_room_linea`, `prizes_bingo`, `ticket_room_bingo`
- Validación de tipos de sala (bronce, plata, oro)
- INSERT/UPDATE incluye nuevos campos
- Evento Socket.IO emite información completa de premios

**Cambios en `getStarterConfig`**:
- Retorna configuración completa incluyendo `ticket_room_linea` y `ticket_room_bingo`

#### roomSettingsController.js

**Cambios en `getLobbyData`**:
```javascript
// Antes
starter: {
  price: 0,
  pots: {
    bingo: 'Ticket Oro',
    line: 'Ticket Bronce',
    pre40: 'Ticket Plata'
  }
}

// Después
starter: {
  price: 0,
  prizes: {
    line: {
      quantity: 2,
      room: 'bronce'
    },
    bingo: {
      quantity: 5,
      room: 'oro'
    }
  },
  status: 'active',
  nextSession: '2025-12-21T19:00:00Z'
}
```

### 3. Frontend Admin

**Archivo**: `client-admin/src/components/StarterConfigCard.jsx`

**Mejoras**:
- Formulario con dos secciones (Premio Línea y Premio Bingo)
- Cada sección tiene:
  - Input numérico para cantidad de tickets
  - Select para tipo de sala (🥉 Bronce, 🥈 Plata, 🥇 Oro)
- Vista de solo lectura muestra tipo de sala con emoji correspondiente
- Estado `editForm` incluye `ticket_room_linea` y `ticket_room_bingo`

**Ejemplo de formulario**:
```jsx
🏆 Premio de Línea
┌─────────────────┬────────────────┐
│ Cantidad: [2]   │ Tipo: [Bronce] │
└─────────────────┴────────────────┘

🎯 Premio de Bingo  
┌─────────────────┬────────────────┐
│ Cantidad: [5]   │ Tipo: [Oro]    │
└─────────────────┴────────────────┘
```

### 4. Frontend Player

**Archivos modificados**:
- `client-player/src/components/CasinoLobby.jsx`
- `client-player/src/styles/CasinoLobby.css`

#### CasinoLobby.jsx

**Cambios en RoomCard**:
```jsx
// Antes: Íconos genéricos
<div className="rewards-icons">
  {room.rewards.map((reward, index) => (
    <FaGift key={index} className="reward-icon" />
  ))}
</div>

// Después: Información real
<div className="rewards-details">
  <div className="reward-item">
    <span className="reward-label">Línea:</span>
    <span className="reward-value">
      2x 🎫 🥉
    </span>
  </div>
  <div className="reward-item">
    <span className="reward-label">Bingo:</span>
    <span className="reward-value">
      5x 🎫 🥇
    </span>
  </div>
</div>
```

**Cambios en `getRoomsData`**:
- Agrega `prizes` al objeto room cuando es Starter
- Obtiene datos desde `lobbyData.starter.prizes`

#### CasinoLobby.css

**Nuevos estilos**:
```css
.rewards-details - Contenedor de premios
.reward-item - Cada fila de premio (Línea/Bingo)
.reward-label - Etiqueta "Línea:" / "Bingo:"
.reward-value - Valor con tickets y emoji de sala
```

## Flujo de Actualización

1. **Admin Panel**: SuperAdmin modifica premios en "Configuración de Salas y Pozos"
2. **Backend**: 
   - Valida datos (cantidad ≥ 0, sala válida)
   - Guarda en `starter_room_config`
   - Emite evento Socket.IO `starter_prizes_updated`
3. **Player Lobby**:
   - Recibe datos vía `/api/game/lobby-data` (cada 30 segundos)
   - Opcionalmente: Socket.IO listener actualiza en tiempo real
   - Muestra premios con cantidad + tipo de sala

## Tiempo Real (Opcional)

Para implementar actualización instantánea en el lobby sin esperar el polling de 30 segundos:

```javascript
// En CasinoLobby.jsx useEffect
const socket = io();
socket.on('starter_prizes_updated', (data) => {
  console.log('[CasinoLobby] 🎁 Premios actualizados:', data);
  loadLobbyData(); // Recargar datos del lobby
});
```

## Testing

### 1. Probar en Admin Panel
```
1. Login como SuperAdmin (andy)
2. Ir a "Configuración de Salas y Pozos"
3. Buscar tarjeta "Sala Starter"
4. Clic en "Editar"
5. Cambiar:
   - Premio Línea: 3 tickets de Plata
   - Premio Bingo: 10 tickets de Oro
6. Guardar cambios
7. Verificar que aparece alert de confirmación
8. Verificar que vista de solo lectura muestra "3 🥈 Plata" y "10 🥇 Oro"
```

### 2. Verificar en Player Lobby
```
1. Abrir lobby del jugador (http://localhost:5173)
2. Buscar sala "Starter"
3. Verificar que muestra:
   - Línea: 3x 🎫 🥈
   - Bingo: 10x 🎫 🥇
4. Esperar 30 segundos y verificar que datos persisten
```

### 3. Verificar Base de Datos
```sql
SELECT * FROM v_starter_config;

-- Debería retornar:
-- prizes_linea | ticket_room_linea | prizes_bingo | ticket_room_bingo
-- 3            | plata             | 10           | oro
```

## Archivos Creados/Modificados

### Creados
- `server/STARTER_TICKET_ROOM_MIGRATION.sql`
- `aplicar_starter_ticket_room_migration.ps1`
- `MEJORAS_STARTER_CONFIG.md` (este archivo)

### Modificados
- `server/src/controllers/starterConfigController.js`
- `server/src/controllers/roomSettingsController.js`
- `client-admin/src/components/StarterConfigCard.jsx`
- `client-player/src/components/CasinoLobby.jsx`
- `client-player/src/styles/CasinoLobby.css`

## Estado del Sistema

✅ Migración de BD aplicada  
✅ Backend actualizado y sin errores  
✅ Frontend Admin con selector de sala  
✅ Frontend Player muestra premios reales  
⏳ Pendiente: Pruebas manuales de persistencia  

## Próximos Pasos

1. Reiniciar servidor backend para cargar nuevos cambios
2. Realizar pruebas manuales según checklist
3. Verificar que cambios se persisten en BD
4. Confirmar actualización visual en tiempo real
