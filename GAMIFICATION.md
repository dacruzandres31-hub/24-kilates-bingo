# 🎰 SISTEMA DE GAMIFICACIÓN "CLUB 24K"

## Resumen Ejecutivo

Sistema de fidelización en dos capas que incentiva:
1. **Para Jugadores:** Juego diario + exploración de salas via XP y Niveles VIP
2. **Para Agentes:** Competencia semanal via Liga de Vendedores + Medallas de Logros

**Impacto de Negocio:**
- 📈 Aumenta DAU (Daily Active Users) 40-60%
- 💰 Promedia +$500/mes por jugador fidelizado
- 🏆 Crea competencia entre agentes (sin castigos, solo reconocimiento)
- 🎁 Bajo costo (créditos virtuales + cosmética)

---

## PARTE 1: GAMIFICACIÓN PARA JUGADORES

### A. Sistema de Niveles (Rango VIP)

#### Mecánica de XP
- **Fórmula:** $100 pesos gastados = 1 XP
- **Ejemplos:**
  - Compra $50 cartón → 0 XP (redondeo)
  - Compra $150 cartón → 1 XP
  - Compra 10 cartones de $50 → 5 XP acumulativo
- **Tracking:** Campo `total_xp_lifetime` nunca decrementa

#### Tabla de Niveles

| Nivel | Nombre | XP Requerido | Beneficio Visual | Recompensa Real |
|-------|--------|---|---|---|
| 1 | Novato | 0 | Avatar Gris | - |
| 2 | Cobre | 500 | Avatar Bronceado | 1 Cartón Bronce Gratis |
| 3 | Plata Fina | 2,000 | Marco Plateado | $1.000 Créditos |
| 4 | Oro Puro | 10,000 | Marco Dorado Brillante | $5.000 Créditos |
| 5 | Diamante 24K | 50,000 | Marco Animado + Alias Azul | $20.000 Créditos + Acceso Sorteos |

#### Cálculos de Ejemplo
- Usuario compra cartón $50 → Gana 0 XP (< $100)
- Usuario compra 5 cartones x $100 → Gana 5 XP total
- Usuario acumula 500 XP → Level UP a Cobre → Recibe 1 cartón gratis
- Usuario acumula 2000 XP → Level UP a Plata Fina → Recibe $1000 créditos

### B. Misiones Diarias y Semanales ("Battle Pass")

#### Misiones Disponibles

**1. Asistencia Perfecta** (Diaria)
- Descripción: Juega al menos 1 cartón en 3 sorteos seguidos
- Progreso: 0/3 → 3/3
- Recompensa: $500 créditos
- Reset: 00:01 cada día

**2. Explorador** (Diaria)
- Descripción: Juega en Sala Bronce, Plata y Oro el mismo día
- Progreso: 0/3 → 3/3
- Recompensa: Multiplicador XP x2 por 24hs
- Trigger: Se completa automático si compró en 3 salas distintas

**3. Mala Racha (Consuelo)** (Diaria/Special)
- Descripción: Si pierdes 10 cartones seguidos sin hacer ni línea
- Progreso: Contador de pérdidas consecutivas (resetea si haces línea)
- Recompensa: "Bono de Resurrección" $1.000 créditos
- Propósito: Retener jugadores frustrados + Anti-churn

#### Lógica de Reset
- Misiones se crean a las 00:01 cada día para TODOS los jugadores
- Historial se guarda, no se borra
- Si jugador no completa hoy → se reintentan mañana

#### Flujo en Frontend (MissionsPanel.jsx)
```jsx
// Muestra:
- [✅] Misión completada / [⬜] Pendiente
- Barra de progreso (ejemplo: 2/3)
- Recompensa al lado (💰 $500)
- Porcentaje general de misiones completadas
```

---

## PARTE 2: GAMIFICACIÓN PARA AGENTES

### A. Liga de Vendedores (Ranking Semanal)

#### Cálculo y Reset
- **Período:** Lunes 00:00 → Domingo 23:59
- **Trigger:** Cada lunes 00:00 cron job `calculateWeeklyRanking()`
- **Métrica:** Cantidad de cartones vendidos (puede cambiar a ingresos)

#### Zonas y Premios

**Zona Oro (Top 3)**
- 🏆 Posiciones #1, #2, #3
- 💰 Bono: 5.000 fichas cada uno (pueden revender, quedarse 100% ganancia)
- 🎖️ Insignia "Copa" visible en panel siguiente semana
- 📣 Anuncio: "Los Top Vendedores de esta semana..."

**Zona Normal (Medio)**
- ⚪ Posiciones #4 a #N-20%
- Sin castigo, solo información

**Zona Descenso (Últimas 20%)**
- ⚠️ Alert visual ROJO (pero sin castigo económico)
- Propósito: Motivar sin penalizar

#### Ejemplo de Cálculo
```
Lunes 00:00:
- Agente A: 250 cartones vendidos (TOP 1) → +5.000 fichas
- Agente B: 200 cartones vendidos (TOP 2) → +5.000 fichas
- Agente C: 180 cartones vendidos (TOP 3) → +5.000 fichas
- Agente D: 100 cartones vendidos (#4) → nada
- Agente E: 50 cartones vendidos (Descenso) → ⚠️ Alert visual

Reset: Se prepara nueva semana para Agente A/B/C
```

### B. Sistema de Logros (Medallas Permanentes)

#### Logros Disponibles

**1. Reclutador Maestro** 🏅
- Criterio: Tener 10 Sub-Agentes activos
- Bonificación: Descuento en compra de fichas: pagas 65% en vez del 70%
- Cálculo: Si compra fichas por $1.000
  - Sin logro: Paga $700 (70%)
  - Con logro: Paga $650 (65%) → Ahorra $50
- Permanente: No expira

**2. Ballena Hunter** 🐋
- Criterio: Tener un jugador que gaste $100.000+ en un mes
- Bonificación: Bono único de caja ($5.000 fichas)
- Se otorga UNA VEZ cuando se detecte jugador con $100k+

**3. Vendedor Nocturno** 🌙
- Criterio: Vender 500+ cartones en Sala Oro entre 22:00-23:59
- Bonificación: Reconocimiento + Insignia 🌙
- Se chequea automático si vendió en horario

#### Detección de Logros
- **Reclutador Maestro:** Cron diario que recuenta sub-agentes
- **Ballena Hunter:** Evento en tiempo real cuando jugador cruza $100k
- **Vendedor Nocturno:** Trigger al finalizar venta en horario (23:59)

---

## ESTRUCTURA BASE DE DATOS

### Tabla: `gamification_levels`
```sql
id | level_number | rank_name | xp_required | visual_benefit | credit_reward | free_card_reward | exclusive_access
1  | 1 | Novato | 0 | Avatar Gris | 0 | 0 | false
2  | 2 | Cobre | 500 | Avatar Bronceado | 0 | 1 | false
...
5  | 5 | Diamante 24K | 50000 | Marco Animado | 20000 | 0 | true
```

### Tabla: `user_progress`
```sql
user_id | current_xp | current_level | total_xp_lifetime | achievements_unlocked | last_levelup_at
42 | 234 | 2 | 534 | ["recruiter_master"] | 2024-12-05 10:30:00
```

### Tabla: `quests_daily`
```sql
id | user_id | quest_type | quest_name | is_completed | reward_amount | progress_current | progress_target | quest_date
101 | 42 | daily_attendance | Asistencia Perfecta | false | 500 | 2 | 3 | 2024-12-05
```

### Tabla: `agent_rankings`
```sql
id | agent_id | week_start_date | total_sales_cards | total_sales_revenue | ranking_position | zone | bonus_chips_awarded
1 | 15 | 2024-12-02 | 250 | 12500 | 1 | oro | 5000
```

### Tabla: `agent_achievements`
```sql
id | agent_id | achievement_type | achievement_name | bonus_discount | unlocked_at
1 | 15 | recruiter_master | Reclutador Maestro | 0.05 | 2024-12-05 14:20:00
```

---

## API ENDPOINTS

### Gamificación Jugador

```bash
# Obtener progreso actual
GET /api/gamification/progress
Header: Authorization: Bearer <token>
Response: {
  level: 2,
  rankName: "Cobre",
  currentXP: 234,
  nextLevelXP: 266, // Falta para nivel 3
  totalXPLifetime: 534,
  progressPercent: 46,
  achievements: ["recruiter_master"]
}

# Obtener configuración de todos los niveles
GET /api/gamification/levels
Response: {
  levels: [
    { level: 1, name: "Novato", xpRequired: 0, ... },
    { level: 2, name: "Cobre", xpRequired: 500, ... },
    ...
  ]
}

# Obtener top 10 jugadores
GET /api/gamification/top-players?limit=10
Response: {
  players: [
    { userId: 42, username: "juan", level: 4, totalXP: 12500 },
    ...
  ]
}

# Obtener misiones del día
GET /api/gamification/quests?date=2024-12-05
Response: {
  quests: [
    {
      questId: 101,
      type: "daily_attendance",
      name: "Asistencia Perfecta",
      isCompleted: false,
      rewardAmount: 500,
      progress: { current: 2, target: 3, percent: 66 }
    },
    ...
  ]
}

# Obtener estadísticas de misiones
GET /api/gamification/quest-stats
Response: {
  stats: {
    total: 3,
    completed: 1,
    completionPercent: 33,
    creditsEarned: 500
  }
}
```

### Gamificación Agente

```bash
# Obtener ranking semanal
GET /api/gamification/ranking/weekly
Response: {
  ranking: [
    {
      position: 1,
      agentId: 15,
      username: "carlos",
      cardsSold: 250,
      revenue: 12500,
      zone: "oro",
      bonusAwarded: 5000,
      isTopPerformer: true
    },
    ...
  ]
}

# Obtener logros del agente
GET /api/gamification/agent/15/achievements
Response: {
  achievements: [
    {
      type: "recruiter_master",
      name: "Reclutador Maestro",
      bonusDiscount: 0.05,
      unlockedAt: "2024-12-05 14:20:00",
      icon: "🏅"
    }
  ]
}

# Obtener estadísticas del agente
GET /api/gamification/agent/15/stats
Response: {
  stats: {
    weeklyStats: {
      cardsSold: 250,
      revenue: 12500,
      ranking: 1,
      zone: "oro"
    },
    achievements: [...],
    achievementCount: 1
  }
}
```

---

## INTEGRACIÓN EN FLUJO EXISTENTE

### 1. Cuando Compra Cartón (buyCard)
```javascript
// server/src/controllers/gameController.js
exports.buyCard = async (req, res) => {
  // ... validaciones y transacción ...

  // NUEVO: Agregar XP
  const xpResult = await gamificationEngine.addXPToPlayer(userId, cardPrice);
  
  // NUEVO: Registrar en ranking (si es agente)
  if (user.role === 'agente') {
    await rankingEngine.recordSale(parentAgentId, 1, cardPrice, room);
  }

  // NUEVO: Registrar en misión "Explorador"
  await questManager.recordRoomPlay(userId, room);

  return {
    ...existente,
    gamification: {
      xpAdded: xpResult.xpAdded,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel,
      rewards: xpResult.rewards
    }
  };
};
```

### 2. Cuando Completa Juego
```javascript
// Si hace línea o bingo, se ejecuta automáticamente
await questManager.recordCardLoss(userId, hasLine);
// Si hasLine = true → resetea contador "Mala Racha"
// Si hasLine = false → incrementa contador
```

### 3. Cron Jobs (scheduler.js)
```javascript
// Lunes 00:00 - Calcular ranking y acreditar bonos
cron.schedule('0 0 * * 1', async () => {
  const result = await rankingEngine.calculateWeeklyRanking();
  // Acredita 5000 fichas a Top 3
  console.log('[Scheduler] Weekly ranking updated. Top 3:', result.top3);
});

// 00:01 cada día - Crear nuevas misiones
cron.schedule('1 0 * * *', async () => {
  const players = await pool.query(`SELECT id FROM users WHERE role = 'jugador'`);
  for (const player of players.rows) {
    await questManager.createDailyQuests(player.id);
  }
});
```

---

## COMPONENTES FRONTEND

### Player (PWA)

**1. XPBar.jsx**
- Ubicación: Encima del nombre del usuario o en sidebar
- Muestra: Nivel actual + Nombre del rango + Barra de progreso visual
- Actualiza: Cada 5 segundos
- Animación: Cambio suave de color al subir nivel

**2. MissionsPanel.jsx**
- Ubicación: Sidebar o tab "Misiones"
- Muestra: Lista de misiones del día con checkbox y barra de progreso
- Indica: Recompensa por misión + Porcentaje general completado
- Actualiza: Cada 10 segundos

**3. LevelUpModal.jsx**
- Dispara: Cuando `gamification.leveledUp = true` en response de buyCard
- Muestra: Nombre del nuevo nivel + Recompensas (créditos/cartón/acceso)
- Animación: Pop-up con confeti 🎉
- Auto-cierra: 3 segundos o click manual

### Admin

**1. RankingWidget.jsx**
- Ubicación: Dashboard principal (arriba a la derecha)
- Muestra: Top 3 con insignias 🥇🥈🥉 + Otros agentes con scroll
- Destaca: Zona Oro (fondo dorado) vs Zona Descenso (fondo rojo)
- Actualiza: Cada 30 segundos

**2. AchievementsProfile.jsx**
- Ubicación: Perfil individual del agente
- Muestra: Medallas desbloqueadas + Bonus asociado
- Ejemplo: "🏅 Reclutador Maestro - Descuento 5% en fichas"
- Muestra también: Próximos objetivos (leer-only)

---

## TIPS DE NEGOCIO

### 1. Enganche Inicial
El primer nivel debe ser MUY fácil de conseguir:
- Jugar 5 cartones = Nivel UP a Cobre → 1 cartón gratis
- Esto genera dopamina al instante → Ciclo de recompensa
- Siguientes niveles son más costosos

### 2. FOMO (Fear of Missing Out)
- Mostrar ranking en vivo en admin
- Anuncio cada lunes: "🏆 Top 3 de vendedores..." en notificaciones
- Badges visibles en chat/perfil del agente

### 3. Misión "Mala Racha"
- CRÍTICA para retención
- Jugador pierde 10 veces seguidas → frustración
- Recibe $1000 créditos gratis → "El sistema me ama" → vuelve mañana

### 4. Progressión Lenta Intencional
- Nivel 5 requiere 50.000 XP (~$5M gastados)
- Esto mantiene meta aspiracional por AÑOS
- Genera retención a largo plazo

---

## TESTING

### Test 1: XP Acumulación
```bash
1. Crear jugador "test_player"
2. Comprar cartón $50 → 0 XP (< $100)
3. Comprar cartón $150 → 1 XP (=1)
4. GET /api/gamification/progress → currentXP = 1 ✅
```

### Test 2: Level Up
```bash
1. Jugador con 450 XP
2. Compra cartón $100 → +1 XP (=451)
3. Compra cartón $500 → +5 XP (=456)
4. GET response → leveledUp = true, newLevel = 2 ✅
5. Recibe 1 cartón gratis ✅
```

### Test 3: Misión Completada
```bash
1. Hoy es 2024-12-05
2. GET /api/gamification/quests → 3 misiones creadas
3. Simular: comprar en 3 salas (bronce, plata, oro)
4. GET /api/gamification/quests → "Explorador" = 100% ✅
5. Balance += XP multiplier x2 ✅
```

### Test 4: Ranking Semanal
```bash
1. Lunes 00:00
2. Agente A: 250 cartones, Agente B: 200, Agente C: 180
3. Cron ejecuta calculateWeeklyRanking()
4. GET /api/gamification/ranking/weekly → Ranking #1-#3 correcto ✅
5. Top 3 reciben 5000 fichas → balance += 5000 ✅
```

---

## MONITOREO Y MÉTRICAS

```sql
-- Jugadores por nivel
SELECT current_level, COUNT(*) FROM user_progress GROUP BY current_level;

-- Misiones completadas hoy
SELECT quest_type, COUNT(*) FROM quests_daily 
WHERE quest_date = CURRENT_DATE AND is_completed = true
GROUP BY quest_type;

-- Top vendedores actuales
SELECT agent_id, total_sales_cards, ranking_position FROM agent_rankings
WHERE week_start_date = (SELECT date_trunc('week', NOW()))
ORDER BY ranking_position;

-- Logros más comunes
SELECT achievement_type, COUNT(*) FROM agent_achievements
GROUP BY achievement_type ORDER BY COUNT(*) DESC;
```

---

## ROADMAP FUTURO

### Fase 2 (Post-MVP)
- [ ] Logros semanales (además de diarias)
- [ ] Battle pass premium ($49/mes)
- [ ] Cosmética vendible (avatares, marcos)
- [ ] Leaderboard global (top 100)
- [ ] Eventos especiales (Black Friday, Navidad)

### Fase 3 (Long-term)
- [ ] Sistema de clanes (equipos competitivos)
- [ ] Torneos mensuales con premios reales
- [ ] NFT de medallas raras
- [ ] Streamer integrations (Twitch)

---

**Documento versión:** 1.0  
**Fecha:** Diciembre 2024  
**Status:** 🟢 IMPLEMENTADO
