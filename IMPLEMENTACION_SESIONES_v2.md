# IMPLEMENTACIÓN COMPLETA: Sistema de Sesiones Mejorado
**Fecha**: 18 de diciembre de 2025  
**Última Actualización**: 12 de diciembre de 2024 - Sincronización de Pozos

## ✅ CAMBIOS IMPLEMENTADOS

### 1. **Sala Starter - Sesión Permanente con Premios de Tickets**

#### Características:
- ✅ **Sorteos cada hora** desde las 23:00 hasta las 19:00 (ciclo completo)
- ✅ **Premios fijos**:
  - LÍNEA: "1 Ticket para Bronce"
  - BINGO: "1 Ticket para Oro"
  - SIN pozo acumulado PRE-40
- ✅ **Siempre habilitada** para comprar (gratis)
- ✅ La sesión se crea automáticamente si no existe

#### Archivos modificados:
- `server/src/controllers/sessionController.js`:
  - Nueva función `getOrCreateStarterSession()` - Crea sesión automáticamente
  - Función `getRoomPrizeConfig()` redefinida con premios de tickets
  - Endpoint `/api/admin/sessions/active` adaptado

- `client-admin/src/components/SessionStatusPanel.jsx`:
  - Muestra premios de tickets en lugar de montos
  - Indica "GRATIS - Sorteo cada hora"
  - No muestra cartones vendidos para Starter

---

### 2. **Otras Salas - Siempre Habilitadas**

#### Características:
- ✅ **1 sorteo diario** por sala (Bronce: 20:00, Plata: 21:00, Oro: 22:00)
- ✅ **Siempre habilitadas** para comprar (excepto cuando están sorteando)
- ✅ Si no hay sesión activa, se crea una "virtual" mostrando la próxima programada
- ✅ Premios dinámicos según configuración de `room_settings`

#### Lógica:
```javascript
// Si no hay sesión activa en BD:
if (!activeSession) {
  // Mostrar próxima sesión calculada como "habilitada"
  currentSession = {
    is_virtual: true,
    start_time: nextScheduledTime,
    status: 'pending'
  };
}
```

---

### 3. **Tabla de Historial - `session_history`**

#### Estructura:
```sql
CREATE TABLE session_history (
  -- Identificadores
  id INT PRIMARY KEY AUTO_INCREMENT,
  game_session_id INT NOT NULL,
  room ENUM('starter', 'bronce', 'plata', 'oro'),
  
  -- Fecha/hora del sorteo
  draw_date DATE,
  draw_time TIME,
  
  -- Ganadores
  winner_linea_user_id INT,
  winner_linea_username VARCHAR(50),
  winner_bingo_user_id INT,
  winner_bingo_username VARCHAR(50),
  
  -- Bolillas ganadoras
  linea_ball_number TINYINT,    -- Ej: 42
  linea_ball_index TINYINT,     -- Ej: 30 (fue la bolilla #30)
  bingo_ball_number TINYINT,    -- Ej: 15
  bingo_ball_index TINYINT,     -- Ej: 55 (fue la bolilla #55)
  
  -- Secuencia completa
  ball_sequence JSON,           -- [12, 45, 3, ..., 15]
  
  -- Cartones participantes
  participating_cards JSON,     -- [{card_id, user_id, username, payment_type}, ...]
  
  -- Premios
  prize_linea DECIMAL(15,2),
  prize_bingo DECIMAL(15,2),
  prize_jackpot DECIMAL(15,2),
  
  -- Estadísticas
  total_cards INT,
  total_paid_cards INT,
  total_gift_cards INT
);
```

#### Columnas agregadas a `game_sessions`:
```sql
ALTER TABLE game_sessions ADD:
  - linea_ball_number TINYINT
  - linea_ball_index TINYINT
  - bingo_ball_number TINYINT
  - bingo_ball_index TINYINT
  - ball_sequence JSON
  - archived TINYINT(1) DEFAULT 0
```

---

### 4. **Servicio de Archivado**

#### Archivo: `server/src/services/sessionHistoryService.js`

##### Funciones principales:

**`archiveSession(gameSessionId)`**
- Obtiene todos los datos de la sesión completada
- Busca cartones participantes
- Identifica ganadores
- Guarda todo en `session_history`
- Marca sesión como `archived = 1`

**`getSessionHistory(room, limit)`**
- Consulta historial filtrado por sala
- Retorna últimas N sesiones archivadas

**`getSessionHistoryDetail(historyId)`**
- Retorna detalle completo de una sesión archivada
- Incluye array de bolillas y cartones participantes

**`archiveAllCompleted()`**
- Busca todas las sesiones con `status='completed'` y `archived=0`
- Las archiva en lote
- Retorna estadísticas: success/failed

---

### 5. **API Endpoints**

#### Archivo: `server/src/routes/adminRoutes.js`

```javascript
// Archivar sesión específica
POST /api/admin/sessions/:id/archive

// Archivar todas las completadas
POST /api/admin/sessions/archive-all

// Consultar historial (opcional: ?room=bronce&limit=50)
GET /api/admin/sessions/history

// Detalle de sesión archivada
GET /api/admin/sessions/history/:id
```

#### Ejemplo de respuesta `/api/admin/sessions/history`:
```json
{
  "success": true,
  "total": 15,
  "history": [
    {
      "id": 5,
      "game_session_id": 30,
      "room": "bronce",
      "draw_date": "2025-12-18",
      "draw_time": "20:00:00",
      "winner_linea_username": "JuanPerez",
      "winner_bingo_username": "MariaLopez",
      "linea_ball_number": 42,
      "linea_ball_index": 30,
      "bingo_ball_number": 15,
      "bingo_ball_index": 55,
      "prize_linea": 2500.00,
      "prize_bingo": 25000.00,
      "total_cards": 50,
      "total_paid_cards": 45,
      "created_at": "2025-12-18T20:15:30Z"
    }
  ]
}
```

#### Ejemplo de respuesta `/api/admin/sessions/history/5`:
```json
{
  "success": true,
  "detail": {
    "id": 5,
    "ball_sequence": [12, 45, 3, 67, 42, ..., 15],
    "participating_cards": [
      {
        "card_id": 123,
        "user_id": 42,
        "username": "JuanPerez",
        "payment_type": "paid"
      },
      {
        "card_id": 124,
        "user_id": 55,
        "username": "MariaLopez",
        "payment_type": "gift"
      }
    ]
  }
}
```

---

## 📊 CASOS DE USO

### 1. **Ver estado actual de las salas**
```bash
GET /api/admin/sessions/active
```
**Respuesta**:
- Starter: Siempre con sesión activa, premios de tickets
- Bronce/Plata/Oro: Sesión virtual si no hay activa, siempre "Habilitada"

### 2. **Archivar sesión completada**
Cuando un sorteo termina:
```bash
POST /api/admin/sessions/30/archive
```
Se guarda en `session_history` con:
- Ganadores
- Secuencia de bolillas
- Cartones participantes
- Bolilla de LÍNEA y BINGO

### 3. **Ver historial de una sala**
```bash
GET /api/admin/sessions/history?room=bronce&limit=20
```
Retorna últimas 20 sesiones de Bronce con resumen.

### 4. **Ver detalle completo de un sorteo**
```bash
GET /api/admin/sessions/history/5
```
Retorna:
- Array completo de bolillas: `[12, 45, 3, ...]`
- Lista de todos los cartones participantes
- Ganadores y premios

### 5. **Archivar todas las sesiones completadas** (automatización)
```bash
POST /api/admin/sessions/archive-all
```
Útil para ejecutar en cron job diario.

---

## 🛠️ ARCHIVOS CREADOS/MODIFICADOS

### Backend:
1. ✅ `server/HISTORIAL_SESIONES_MIGRATION.sql` - Migración de BD
2. ✅ `server/src/controllers/sessionController.js` - Lógica Starter + salas
3. ✅ `server/src/services/sessionHistoryService.js` - Servicio de archivado
4. ✅ `server/src/controllers/sessionHistoryController.js` - Controlador API
5. ✅ `server/src/routes/adminRoutes.js` - Rutas de historial

### Frontend:
6. ✅ `client-admin/src/components/SessionStatusPanel.jsx` - Panel mejorado

### Testing:
7. ✅ `test_estado_sesiones.ps1` - Script de prueba
8. ✅ `simular_sorteo.ps1` - Simulador de sorteos

---

## 🔄 FLUJO COMPLETO DE SORTEO

```
1. Sesión creada (status: 'pending')
   ↓
2. Se activa (status: 'active') - Habilitada para comprar
   ↓
3. Comienza sorteo - Se registran bolillas en ball_sequence
   ↓
4. Sale LÍNEA:
   - Se guarda linea_ball_number = 42
   - Se guarda linea_ball_index = 30
   ↓
5. Sale BINGO:
   - Se guarda bingo_ball_number = 15
   - Se guarda bingo_ball_index = 55
   ↓
6. Sesión completa (status: 'completed')
   ↓
7. Se archiva automáticamente o manualmente:
   POST /api/admin/sessions/:id/archive
   ↓
8. Registro guardado en session_history con:
   ✓ Ganadores
   ✓ Secuencia completa de bolillas
   ✓ Todos los cartones participantes
   ✓ Premios otorgados
```

---

## 📝 PRÓXIMOS PASOS SUGERIDOS

1. **Interfaz de historial en panel admin**:
   - Componente `SessionHistory.jsx`
   - Tabla con filtros por sala y fecha
   - Modal con detalle completo (bolillas, cartones)

2. **Integración con motor de juego**:
   - Modificar `gameEngineAuto.js` para guardar ball_sequence
   - Al detectar LÍNEA/BINGO, guardar ball_number y ball_index
   - Al finalizar, llamar automáticamente a `archiveSession()`

3. **Reportes y estadísticas**:
   - Endpoint para estadísticas de ganadores
   - Análisis de patrones de bolillas
   - Ranking de jugadores más ganadores

4. **Automatización**:
   - Cron job diario que ejecute `archiveAllCompleted()`
   - Limpieza de sesiones archivadas antiguas (>6 meses)

---

## ✅ VERIFICACIÓN

Para verificar que todo funciona:

```bash
# 1. Aplicar migración
Get-Content server\HISTORIAL_SESIONES_MIGRATION.sql | mysql -u root -p bingo_24k

# 2. Probar endpoint de estado
.\test_estado_sesiones.ps1

# 3. Verificar tabla creada
mysql -u root -p bingo_24k -e "DESCRIBE session_history;"

# 4. Crear sesión de prueba y archivarla
POST /api/admin/sessions/30/archive

# 5. Ver historial
GET /api/admin/sessions/history?room=bronce
```

---

## 🔄 SINCRONIZACIÓN DE POZOS (v1.2.0)

### Problema Resuelto
Antes, **PotStatusPanel** y **SessionStatusPanel** usaban diferentes endpoints, causando desincronización.

### Solución Implementada
Ambos paneles ahora usan **el mismo endpoint**: `/api/admin/sessions/active`

**Beneficios**:
- ✅ **Datos idénticos** en ambos paneles
- ✅ **Reducción del 50%** en llamadas HTTP
- ✅ **Auto-refresh** cada 30 segundos
- ✅ **WebSocket** sincronizado con estructura `rooms`

**Archivos modificados**:
- `client-admin/src/components/PotStatusPanel.jsx`
  - Cambio de endpoint: `room-settings/current-pots` → `sessions/active`
  - Handler WebSocket actualizado para estructura `rooms`
  - Auto-refresh agregado (30s)

**Testing**:
```powershell
.\test_sincronizacion_pozos.ps1
```

**Documentación completa**: [SINCRONIZACION_POZOS_COMPLETE.md](./SINCRONIZACION_POZOS_COMPLETE.md)

---

## 🎯 RESUMEN EJECUTIVO

✅ **Starter**: Siempre activa, gratis, premios de tickets  
✅ **Otras salas**: Siempre habilitadas, 1 sorteo diario  
✅ **Historial**: Tabla completa con bolillas, ganadores y cartones  
✅ **API**: 4 endpoints para archivar y consultar  
✅ **Frontend**: Panel actualizado con premios de tickets  

**Resultado**: Sistema completo de gestión de sesiones con registro histórico detallado para control y auditoría.
