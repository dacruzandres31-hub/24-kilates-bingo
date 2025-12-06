# 🎮 INTEGRACIÓN DE GAMIFICACIÓN - CHECKLIST

## Pre-requisitos Completados

- [x] Base de datos schema actualizado
- [x] Servicios backend creados
- [x] Controllers creados
- [x] Rutas API creadas
- [x] Componentes React creados
- [x] Documentación completa

---

## PASO A PASO: ACTIVAR GAMIFICACIÓN

### PASO 1: Database (Primera vez)
```bash
# 1.1 Conectar a PostgreSQL
psql -U postgres

# 1.2 Crear database si no existe
CREATE DATABASE bingo_24k;

# 1.3 Ejecutar schema (IMPORTANTE: incluye 4 tablas nuevas)
\q
psql -U postgres -d bingo_24k -f server/schema.sql

# 1.4 Verificar tablas nuevas
psql -U postgres -d bingo_24k
\dt gamification_*
\dt user_progress
\dt quests_daily
\dt agent_rankings
\dt agent_achievements
```

✅ Verificación: Deben mostrarse 5 tablas

### PASO 2: Backend - Verificar Servicios

**2.1 Comprobar archivo `server/src/services/`**
```bash
ls -la server/src/services/
# Debe incluir:
# - gamification_engine.js ✅
# - quest_manager.js ✅
# - ranking_engine.js ✅
```

**2.2 Comprobar imports en `index.js`**
```javascript
// Debe existir:
const gamificationRoutes = require('./routes/gamificationRoutes');

// Y registrado:
app.use('/api/gamification', gamificationRoutes);
```

**2.3 Comprobar scheduler en `scheduler.js`**
```javascript
// Debe existir:
const questManager = require('./quest_manager');
const rankingEngine = require('./ranking_engine');

// Y los 2 cron jobs:
// - Weekly Ranking (Lunes 00:00)
// - Daily Quests (00:01)
```

✅ Verificación: `npm run dev` debe mostrar 5 jobs activos

### PASO 3: Frontend Player - Integrar Componentes

**3.1 En `client-player/src/pages/GameRoom.jsx`**

Agregar imports:
```jsx
import XPBar from '../components/XPBar';
import MissionsPanel from '../components/MissionsPanel';
import LevelUpModal from '../components/LevelUpModal';
```

Agregar en JSX (ejemplo layout):
```jsx
export default function GameRoom() {
  const [levelUpData, setLevelUpData] = useState(null);

  return (
    <div className="flex gap-4">
      {/* Sidebar izquierdo */}
      <div className="w-1/4 bg-slate-800 rounded p-4 space-y-4">
        <XPBar />
        <MissionsPanel />
      </div>

      {/* Centro - Juego */}
      <div className="w-1/2">
        <BallDraw />
        <BingoCard />
      </div>

      {/* Right - Pots */}
      <div className="w-1/4">
        <PrizeOdometer />
      </div>

      {/* Modal level-up */}
      <LevelUpModal
        isOpen={levelUpData?.leveledUp}
        level={levelUpData?.newLevel}
        rewards={levelUpData?.rewards}
        onClose={() => setLevelUpData(null)}
      />
    </div>
  );
}
```

**3.2 Manejar response de buyCard con XP**

En el componente que llama `buyCard`:
```jsx
const handleBuyCard = async (cardId) => {
  const response = await axios.post('/api/game/buy-card', {
    cardId,
    roomType: 'plata',
    playDate: new Date()
  });

  // 🆕 Nuevo: Manejar gamification
  if (response.data.gamification?.leveledUp) {
    setLevelUpData(response.data.gamification);
  }
};
```

### PASO 4: Frontend Admin - Integrar Componentes

**4.1 En `client-admin/src/pages/Dashboard.jsx`** (o similar)

Agregar imports:
```jsx
import RankingWidget from '../components/RankingWidget';
```

Agregar en JSX:
```jsx
export default function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Widgets existentes */}
      <UserCountWidget />
      <RevenueWidget />
      <ActiveSessionsWidget />

      {/* 🆕 Nuevo widget de ranking */}
      <div className="col-span-3">
        <RankingWidget />
      </div>
    </div>
  );
}
```

**4.2 En perfil individual del agente**

Agregar imports:
```jsx
import AchievementsProfile from '../components/AchievementsProfile';
```

Agregar en JSX:
```jsx
export default function AgentProfile({ agentId }) {
  return (
    <div className="space-y-4">
      {/* Info existente */}
      <UserInfo agentId={agentId} />
      <NetworkTree agentId={agentId} />

      {/* 🆕 Nuevo: Medallas */}
      <AchievementsProfile agentId={agentId} />
    </div>
  );
}
```

### PASO 5: Testing - Verificar Funcionamiento

**5.1 Test: XP System**
```bash
# Terminal 1: Ver logs
npm run dev

# Terminal 2: Crear usuario test
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_gamer",
    "password": "123456",
    "role": "jugador"
  }'

# Terminal 3: Obtener progreso (sin XP aún)
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/api/gamification/progress

# Resultado esperado:
# {
#   "level": 1,
#   "rankName": "Novato",
#   "currentXP": 0,
#   "totalXPLifetime": 0,
#   "progressPercent": 0
# }
```

**5.2 Test: Compra con XP**
```bash
# Simular compra de cartón (mock)
# Esperado:
# - XP suma en response
# - Level puede cambiar
# - Modal de level-up dispara si aplica

curl -X POST http://localhost:3000/api/game/buy-card \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": 1,
    "roomType": "plata",
    "playDate": "2024-12-05"
  }'

# Verificar response:
# {
#   "gamification": {
#     "xpAdded": 1,
#     "leveledUp": false,
#     "currentXP": 1,
#     "nextLevelXP": 500
#   }
# }
```

**5.3 Test: Misiones**
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/api/gamification/quests

# Resultado: Array de 3 misiones (o 0 si no es hora 00:01)
```

**5.4 Test: Ranking**
```bash
curl http://localhost:3000/api/gamification/ranking/weekly

# Resultado: Array vacío (hasta lunes 00:00)
```

### PASO 6: Production - Deploy

**6.1 Environment Variables (.env)**
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/bingo_24k
JWT_SECRET=tu_super_secreto_aqui
PORT=3000
NODE_ENV=production
CORS_ORIGIN_PLAYER=https://tudominio.com
CORS_ORIGIN_ADMIN=https://admin.tudominio.com
```

**6.2 Package.json Scripts**
```json
{
  "scripts": {
    "dev": "concurrently 'npm run server' 'npm run client'",
    "server": "cd server && npm run dev",
    "client": "cd client-player && npm run dev",
    "build": "npm run build:server && npm run build:player && npm run build:admin",
    "start": "node server/src/index.js"
  }
}
```

**6.3 Verificar Logs en Producción**

```bash
# Scheduler debe mostrar:
[Scheduler] Iniciando...
[Scheduler] Job registrado: T-5 Closure Monitor
[Scheduler] Job registrado: Weekly Ranking Reset (Lunes 00:00)
[Scheduler] Job registrado: Daily Quests Refresh (00:01 diario)
[Scheduler] Job registrado: Stock Health Check (cada 6h)
[Scheduler] Job registrado: Expired Cleanup (00:05 diario)
```

---

## ⚠️ TROUBLESHOOTING

### Error: "Cannot find module 'gamification_engine'"
**Solución:** Verificar que los archivos existen en `server/src/services/`

### Error: "Database error: table 'user_progress' not found"
**Solución:** Correr schema.sql nuevamente
```bash
psql -U postgres -d bingo_24k -f server/schema.sql
```

### XP no suma en compra
**Solución:** Verificar que `gameController.js` incluya el import y la llamada a `gamification_engine`

### Componentes no se ven en frontend
**Solución:** Verificar que los componentes están importados correctamente en la página

### Cron jobs no ejecutan
**Solución:** Verificar que scheduler.js importa questManager y rankingEngine

---

## ✅ CHECKLIST FINAL

### Backend
- [ ] schema.sql actualizado con 4 tablas nuevas
- [ ] gamification_engine.js creado
- [ ] quest_manager.js creado
- [ ] ranking_engine.js creado
- [ ] gamificationController.js creado
- [ ] gamificationRoutes.js creado
- [ ] gameController.js actualizado con XP
- [ ] scheduler.js actualizado con 2 cron jobs
- [ ] index.js registra gamificationRoutes
- [ ] `npm run dev` muestra 5 jobs en scheduler

### Frontend Player
- [ ] XPBar.jsx creado
- [ ] MissionsPanel.jsx creado
- [ ] LevelUpModal.jsx creado
- [ ] GameRoom.jsx integra componentes
- [ ] buyCard respuesta maneja gamification

### Frontend Admin
- [ ] RankingWidget.jsx creado
- [ ] AchievementsProfile.jsx creado
- [ ] Dashboard integra RankingWidget
- [ ] Perfil agente integra AchievementsProfile

### Testing
- [ ] Endpoint `/api/gamification/progress` funciona
- [ ] Endpoint `/api/gamification/levels` funciona
- [ ] Endpoint `/api/gamification/quests` funciona
- [ ] Endpoint `/api/gamification/ranking/weekly` funciona
- [ ] XP suma en buyCard
- [ ] Level-up dispara modal

### Documentación
- [ ] GAMIFICATION.md está en root
- [ ] GAMIFICATION_SUMMARY.md está en root
- [ ] Leer GAMIFICATION.md sección Testing
- [ ] Verificar INVENTORY_v1.1.md

---

## 🎯 PRÓXIMOS PASOS (Post-MVP)

1. **Performance Testing**
   - Simular 1000 jugadores simultáneos
   - Medir tiempo de response de endpoints
   - Optimizar queries si es necesario

2. **Monitoring**
   - Agregar Sentry para error tracking
   - Agregar DataDog para APM
   - Crear dashboards de KPIs

3. **Enhanced Gamification (v1.2)**
   - Logros semanales
   - Battle pass premium
   - Cosmética vendible (avatares)
   - Leaderboard global (top 100)

4. **Marketing**
   - Email: "¡Sube de nivel!"
   - Push: "Misión completada"
   - SMS: "Top 3 de vendedores"

---

## 📞 CONTACTO / SOPORTE

**Preguntas frecuentes:**
- ¿Dónde está la lógica de XP? → `server/src/services/gamification_engine.js`
- ¿Cómo se crean misiones? → `server/src/services/quest_manager.js`
- ¿Cómo funciona ranking? → `server/src/services/ranking_engine.js`
- ¿Cómo se ve en UI? → `client-player/src/components/`

**Recursos:**
- Documentación completa: `GAMIFICATION.md`
- API Reference: `GAMIFICATION_SUMMARY.md`
- Ejemplos de testing: `TESTING.md`
- Status general: `PROJECT_STATUS.md`

---

**Último update:** Diciembre 2024  
**Versión:** 1.1.0 Gamification  
**Status:** ✅ READY TO INTEGRATE  

## ¡INTEGRACIÓN LISTA PARA ACTIVAR! 🚀
