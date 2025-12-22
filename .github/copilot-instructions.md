# Bingo 24K - Instrucciones para Agentes de IA

## Resumen del Proyecto

**Bingo 24K** es una plataforma de bingo online de nivel empresarial con juego en tiempo real, jerarquía multinivel de usuarios (SuperAdmin → Agentes → Jugadores), sistema de gamificación e inventario de NFT cosméticos. Construida con backend Express.js + MySQL + Socket.IO, frontend React PWA.

**Stack**: Node.js 18+, MySQL 8.0+, Express, Socket.IO 4.7, React 18.2, Vite 5.0, Tailwind CSS

## Arquitectura

### Estructura Monorepo (npm workspaces)

```
24-kilates-bingo/
├── server/              # Backend Express (puerto 3000)
│   ├── src/
│   │   ├── controllers/ # Manejadores de solicitudes (12 archivos)
│   │   ├── services/    # Lógica de negocio (16 servicios)
│   │   ├── middleware/  # Autenticación, seguridad, validación
│   │   ├── routes/      # Endpoints API
│   │   ├── socket/      # Manejadores de eventos WebSocket
│   │   └── utils/       # MoneyMath, victoryChecker
│   └── schema.sql       # Esquema MySQL (10+ tablas)
├── client-player/       # PWA del Jugador (puerto 5173)
└── client-admin/        # Panel de Administración (puerto 5174)
```

### Límites Clave de Servicios

**Motor de Juego (`gameEngineAuto.js`)**:

- Patrón Singleton con `initGameEngine(io)` llamado desde `gameAdminController`
- Usa `setInterval` para sorteo automático de bolas (cada 3-5 segundos)
- Emite eventos Socket.IO a la sala `session_${gameSessionId}`
- Eventos críticos: `ball_drawn`, `cards_reordered`, `session_ended`

**Arquitectura WebSocket**:

- **Salas globales**: `session_${gameSessionId}` para broadcast
- **Salas personales**: `user_${userId}` para actualizaciones privadas (cards_reordered, payment_forms)
- Auto-join a sala personal al conectar via evento `join_personal_room`
- Reemplazó HTTP polling con actualizaciones push (85% reducción de latencia)

**Planificador (`scheduler.js`)**:

- 6 trabajos cron ejecutándose via `node-cron`
- T-5 Closure: `* * * * *` (bloquea ventas 5 min antes del juego)
- Ranking Semanal: `0 0 * * 1` (Lunes 00:00)
- Misiones Diarias: `1 0 * * *` (00:01)
- Sesión Starter: `0 19 * * *` (19:00 juego gratis)
- Health Check: `0 */6 * * *` (cada 6 horas)
- Limpieza de Stock: `5 0 * * *` (00:05)

## Flujos de Trabajo Críticos del Desarrollador

### Ejecutar el Sistema

```powershell
# Asegurarse de que MySQL esté corriendo (puerto 3306)
# Verificar que existe la base de datos 'bingo_24k'

# Desde la raíz - inicia todos los workspaces
npm run dev

# Workspaces individuales
npm run dev -w server
npm run dev -w client-player
npm run dev -w client-admin
```

### Configuración de Base de Datos

```powershell
# Configuración inicial
mysql -u root -p bingo_24k < server/schema_completo_mysql.sql

# O ejecutar schema base y migraciones por separado:
mysql -u root -p bingo_24k < server/schema_mysql_base.sql
mysql -u root -p bingo_24k < server/TICKETS_PREMIOS_HIBRIDOS_MIGRATION_MYSQL.sql
mysql -u root -p bingo_24k < server/CHIPS_MOVEMENTS_MIGRATION.sql
mysql -u root -p bingo_24k < server/WITHDRAWAL_REQUESTS_MIGRATION.sql
```

### Testing con Scripts PowerShell

```powershell
# Ubicados en el directorio raíz
.\test_websocket_reordering.ps1  # Actualizaciones de cartones WebSocket
.\test_winner_payments.ps1       # Flujo de reclamo de premios
.\test_withdrawals.ps1           # Sistema de retiros
.\test_api_completo.ps1          # Integración API completa
```

## Convenciones Específicas del Proyecto

### Manejo de Dinero (CRÍTICO)

**NUNCA uses aritmética de JavaScript con dinero**. Siempre usa la utilidad `MoneyMath`:

```javascript
// ❌ INCORRECTO - causa errores de punto flotante
let balance = 100.5;
balance = balance - 50.25; // Puede retornar 50.24999999

// ✅ CORRECTO - aritmética decimal exacta
const MoneyMath = require("../utils/moneyMath");
const balance = MoneyMath.decimal(100.5);
const withdrawal = MoneyMath.decimal(50.25);
const result = balance.minus(withdrawal);
await db.query("UPDATE users SET balance = ?", [MoneyMath.toNumber(result)]);
```

**API de MoneyMath**:

- `decimal(value)` - Crear instancia Decimal
- `add(a, b, c, ...)` - Suma segura
- `subtract(a, b)` - Resta segura
- `multiply(a, b)` - Multiplicación segura
- `percentage(amount, percent)` - Calcular porcentaje
- `toNumber(decimal)` - Convertir para almacenamiento en BD
- `format(amount)` - Formatear como "$1.000.000,50"

Ver `PUNTOS_CRITICOS_PRODUCCION.md` para guía completa.

### Regla de 20 Minutos para Retiros

Los jugadores que reciben depósitos de fichas deben esperar 20 minutos antes de procesar retiros:

```javascript
// Verificación en withdrawalController.js
const lastDeposit = await db.query(
  `SELECT MAX(created_at) FROM chips_movements 
   WHERE user_id = ? AND movement_type = 'deposit'`
);

if (lastDeposit && Date.now() - lastDeposit < 20 * 60 * 1000) {
  throw new Error("Debe esperar 20 minutos después del último depósito");
}
```

**Excepciones**: SuperAdmins y usuarios con `can_process_payouts = true`

### Sistema de Gamificación

Los jugadores ganan XP: `$100 gastados = 1 XP`

**5 Niveles VIP**:

1. Novato (0 XP)
2. Cobre (500 XP) → 1 cartón Bronce gratis
3. Plata Fina (2,000 XP) → $1,000 créditos
4. Oro Puro (10,000 XP) → $5,000 créditos
5. Diamante 24K (50,000 XP) → $20,000 créditos + acceso exclusivo

**Misiones Diarias** (`quest_manager.js`):

- Asistencia Perfecta: Jugar 3 partidas consecutivas (recompensa: $500)
- Explorador: Jugar en 3 salas diferentes (recompensa: 2x XP por 24h)
- Mala Racha: Perder 10 cartones consecutivos (anti-abandono: $1,000)

### Tickets y Premios Híbridos (v1.3.0)

La sala Bronce acepta **dinero O tickets** como pago:

```javascript
// shopController.js - buyCardBronze
if (paymentMethod === "ticket") {
  await inventoryService.consumeTicket(userId, "bronce");
} else {
  await chipsService.deductBalance(userId, cardPrice);
}
```

Los ítems consumibles en `cosmetic_items` tienen:

- `is_consumable = true`
- `ticket_room` = 'bronce'|'plata'|'oro'
- `max_uses = NULL` (ilimitado)

### Patrones de Eventos Socket.IO

**Emisión Backend**:

```javascript
// Broadcast a sesión de juego
this.io
  .to(`session_${gameSessionId}`)
  .emit("ball_drawn", { number, ballIndex });

// Notificación personal
this.io.to(`user_${userId}`).emit("cards_reordered", {
  gameSessionId,
  cards: sortedCards,
  alerts: contextAlerts,
  summary: { totalCards, averageProgress },
});
```

**Escucha Frontend** (en hook `useSocket.js`):

```javascript
socket.on("ball_drawn", handleBallDrawn);
socket.on("cards_reordered", (data) => {
  setCardsData(data); // NO se necesita fetch
});
```

### Patrones de Base de Datos

**Enums** (MySQL ENUM nativo):

- `user_role`: ENUM('superadmin', 'agente', 'jugador')
- `room_type`: ENUM('bronce', 'plata', 'oro', 'free_starter')
- `stock_status`: ENUM('available', 'sold', 'discarded')
- `movement_type`: ENUM('deposit', 'withdrawal', 'purchase', 'prize', 'commission', 'bonus', 'refund')

**Jerarquía Recursiva** (tabla users con MySQL 8.0 CTE):

```sql
-- parent_id referencia users(id)
-- Consultar red del agente con Common Table Expression:
WITH RECURSIVE network AS (
  SELECT id, username, 1 as level FROM users WHERE id = ?
  UNION ALL
  SELECT u.id, u.username, n.level + 1
  FROM users u JOIN network n ON u.parent_id = n.id
) SELECT * FROM network;
```

**Restricciones Únicas**:

- `users.username` - UNIQUE constraint a nivel de BD
- Manejar errores de duplicados (MySQL error 1062) como 409 Conflict en frontend

## Puntos de Integración

### Sistema de Análisis de Cartones

`cardAnalyzer.js` genera configuraciones de vista para cartones apilados:

```javascript
const CardAnalyzer = require("../services/cardAnalyzer");
const analyzer = new CardAnalyzer(drawnNumbers);

cards.forEach((card) => {
  const analysis = analyzer.analyzeCard(card);
  card.viewConfig = {
    stackPosition: analysis.stackPosition,
    opacity: analysis.opacity,
    zIndex: analysis.zIndex,
    alerts: analysis.alerts, // ej., "¡1 número para LÍNEA!"
  };
});
```

Usado en `gameEngineAuto.emitCardsReordering()` para actualizaciones en tiempo real.

### Lógica de Cascada

Cuando ocurre BINGO después de la bola 40, el jackpot se transfiere a la siguiente sesión:

```javascript
// cascadeLogic.js
if (ballIndex > 40) {
  const nextSession = await findNextSession(room);
  await transferJackpot(currentSessionId, nextSession.id, jackpotAmount);
}
```

Rastreado via clave foránea `game_sessions.jackpot_source_id`.

## Sistema de Celebración de Línea (v2.0 - Diciembre 2024)

**Componentes Clave**:

1. **Modal Rediseñado**: Usa `BingoCardPreview` (mismo componente de la grilla 6x5) en lugar de renderizado custom
2. **Anti-Loop Definitivo**: Array `celebratedCardIds` que rastrea cartones ya festejados - NO se resetea durante el juego
3. **Texto Pulsante**: `<h1 className="felicitaciones-pulse">` con animación `pulse-glow` dorada
4. **Timing**: 100ms voz → 1.5s aplausos → 18s pausa → 2s "Continuamos hasta Bingo" → resume

**Implementación en las 4 salas** (Starter, Bronze, Silver, Gold):

```javascript
// State Management
const [celebratedCardIds, setCelebratedCardIds] = useState([]); // IDs ya festejados
const [lineCelebrated, setLineCelebrated] = useState(false); // Flag actual

// Detección de línea
const newWinners = cardsWithWinningLines.filter(card => 
  !celebratedCardIds.includes(card.cardId) // ← Filtro anti-loop
);

if (newWinners.length > 0 && !lineCelebrated) {
  const winnerCard = newWinners[0];
  setWinnerCards([winnerCard]);
  setLineCelebrated(true);
  setCelebratedCardIds([...celebratedCardIds, winnerCard.cardId]); // ← Marcar festejado
}

// Modal JSX
{winnerCards.length > 0 && (
  <div className="winner-celebration-overlay">
    <div className="celebration-content">
      <h1 className="felicitaciones-pulse">¡Felicitaciones!</h1>
      <div className="celebration-subtitle">Ganaste Línea con el cartón {winnerCards[0].cardSerial}</div>
      <div className="celebration-card-display">
        <BingoCardPreview
          card={{ card_serial: winnerCards[0].cardSerial, numbers: winnerCards[0].card.numbers }}
          room="starter" // o "bronce", "plata", "oro"
          drawnNumbers={ballsDrawn.map(b => b.number)}
          winningLines={cardWinningLines[winnerCards[0].cardId] || []}
        />
      </div>
    </div>
  </div>
)}
```

**CSS Crítico**:
- `.felicitaciones-pulse`: Animación scale(1 → 1.05) + glow dorado cada 1.5s
- `.celebration-card-display`: Reutiliza estilos de BingoCardPreview, números marcados correctos
- `.confetti`: Caída animada con rotación aleatoria

## Errores Comunes a Evitar

1. **No gestionar manualmente las salas de Socket.IO**: Usa `notificationService.initialize(io)` y `gameAdminController.initGameEngine(io)` - ellos manejan los joins a salas
2. **Siempre usar sintaxis PowerShell**: Este es un entorno Windows (`pwsh.exe`), no bash
3. **Verificar logs del scheduler**: 6 trabajos deben mostrar "Job registrado" al iniciar
4. **Las migraciones son aditivas**: Nunca modificar `schema.sql` directamente - crear nuevos archivos de migración
5. **El frontend usa Vite**: HMR puede no reflejar cambios en `.env` - reiniciar dev server
6. **MySQL 8.0+**: Usar `AUTO_INCREMENT` para IDs, `JSON` para datos estructurados, soporte para CTEs recursivos con `WITH RECURSIVE`
7. **Celebración de Línea**: NUNCA resetear `celebratedCardIds` durante el juego - solo al iniciar nueva sesión. Usar filtro en lugar de comparación de longitudes

## Índice de Documentación

**Empezar aquí**: `START_HERE.md` - Guía de onboarding de 5 minutos
**Configuración rápida**: `QUICKSTART.md` - Configuración de Base de Datos + Entorno
**Sistemas críticos**: `PUNTOS_CRITICOS_PRODUCCION.md` - MoneyMath, regla 20-min, auditoría
**Testing**: `TESTING.md` - Escenarios de prueba completos
**WebSocket**: `WEBSOCKET_REALTIME_IMPLEMENTATION.md` - Arquitectura en tiempo real
**Gamificación**: `GAMIFICATION.md` - XP, niveles, misiones, rankings
**Tickets**: `TICKETS_PREMIOS_HIBRIDOS.md` - Consumibles + pagos híbridos
**Integración**: `INTEGRATION_CHECKLIST.md` - Activación de features paso a paso

Al trabajar en nuevas features, siempre:

1. Verificar si existe un script de test PowerShell (`.ps1` en raíz)
2. Leer documentos relacionados `*_IMPLEMENTATION.md` o `*_COMPLETE.md`
3. Usar `MoneyMath` para cualquier cálculo financiero
4. Emitir eventos Socket.IO para actualizaciones en tiempo real
5. Agregar trabajos cron a `scheduler.js` si es necesario
6. Actualizar checklist de `PROJECT_STATUS.md`
