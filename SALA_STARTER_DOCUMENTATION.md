# 🎁 SALA STARTER - Documentación Técnica Completa

## Resumen Ejecutivo

**Sala Starter** es un módulo Free-to-Play diseñado para 24K Bingo que se abre a las **19:00 hs** diariamente. Los usuarios pueden jugar **20 cartones gratis** y ganar **cosméticos NFT exclusivos** en lugar de dinero.

### Características Principales
- ✅ **Gratis:** Costo = $0 por cartón
- ✅ **Limitado:** 20 cartones máximo por usuario por día
- ✅ **Horario Fijo:** Disponible solo 19:00-20:00 hs
- ✅ **Premios Visuales:** Cosméticos (NFTs) en lugar de dinero
- ✅ **4 Tipos de Cosméticos:** Marcos Avatar, Skins Cartón, Efectos Chat, Insignias

---

## Arquitectura Técnica

### 1. Base de Datos

#### Tabla: `cosmetic_items`
```sql
CREATE TABLE cosmetic_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,           -- "Marco Azul Neón"
    description TEXT,                     -- Borde azul neón luminoso...
    type VARCHAR(20) NOT NULL,            -- 'avatar_frame', 'card_skin', 'chat_effect', 'badge'
    asset_url VARCHAR(255),               -- 'frame-neon-blue', 'skin-cyberpunk-purple'
    rarity VARCHAR(20) DEFAULT 'common',  -- 'common', 'rare', 'legendary'
    color_hex VARCHAR(7),                 -- '#00BFFF', '#FFD700'
    animation_class VARCHAR(50),          -- 'neon-glow', 'holographic', 'fire-animation'
    is_free_available BOOLEAN DEFAULT FALSE, -- Disponible en drops gratis
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `user_inventory`
```sql
CREATE TABLE user_inventory (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES cosmetic_items(id),
    equipped BOOLEAN DEFAULT FALSE,      -- Está equipado actualmente
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_id)             -- Un usuario no puede tener duplicado
);
```

#### Tabla: `users` - Campos Añadidos
```sql
-- Tres nuevos campos para tracking de cosméticos equipados
equipped_avatar_frame_id INT REFERENCES cosmetic_items(id),
equipped_card_skin_id INT REFERENCES cosmetic_items(id),
equipped_chat_effect_id INT REFERENCES cosmetic_items(id)
```

---

## API Endpoints

### Inventario

#### 1. GET `/api/inventory`
**Obtener inventario completo del usuario**
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/inventory
```

**Respuesta:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Marco Azul Neón",
      "type": "avatar_frame",
      "rarity": "common",
      "color_hex": "#00BFFF",
      "animation_class": "neon-glow",
      "equipped": false
    }
  ]
}
```

---

#### 2. GET `/api/inventory/available`
**Obtener catálogo completo de cosméticos disponibles**
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/inventory/available
```

**Respuesta:**
```json
{
  "available": [
    {
      "id": 1,
      "name": "Marco Azul Neón",
      "type": "avatar_frame",
      "rarity": "common",
      "description": "Borde azul neón luminoso con efecto glow"
    }
  ]
}
```

---

#### 3. GET `/api/inventory/equipped`
**Obtener items equipados actuales del usuario**
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/inventory/equipped
```

**Respuesta:**
```json
{
  "equipped": {
    "avatar_frame": {
      "id": 1,
      "name": "Marco Azul Neón",
      "color_hex": "#00BFFF"
    },
    "card_skin": {
      "id": 8,
      "name": "Skin Ciberpunk Púrpura",
      "color_hex": "#A855F7",
      "animation_class": "cyberpunk"
    },
    "chat_effect": null,
    "badge": null
  }
}
```

---

#### 4. POST `/api/inventory/equip/:itemId`
**Equipar un cosmético**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/inventory/equip/1
```

**Respuesta:**
```json
{
  "success": true,
  "item": {
    "id": 1,
    "name": "Marco Azul Neón",
    "type": "avatar_frame",
    "color_hex": "#00BFFF"
  }
}
```

---

#### 5. POST `/api/inventory/unequip/:type`
**Desequipar un cosmético por tipo**

Tipos válidos: `avatar_frame`, `card_skin`, `chat_effect`, `badge`

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/inventory/unequip/avatar_frame
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Desequipado correctamente"
}
```

---

### Compra de Cartones Gratis

#### 6. POST `/api/game/buy-card-free`
**Comprar cartón gratis en Sala Starter**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 1}' \
  http://localhost:3000/api/game/buy-card-free
```

**Validaciones:**
- Solo para room_type = 'free_starter'
- Máximo 20 cartones por usuario por día
- Costo = $0 (sin descuento de balance)

**Respuesta:**
```json
{
  "success": true,
  "cards": [
    {
      "id": 1001,
      "serialNumber": 1,
      "gridNumbers": [[1, 16, 31, 46, 61], ...],
      "price": 0
    }
  ]
}
```

---

### Premios Free

#### 7. POST `/api/game/claim-free-prize`
**Reclamar premio NFT después de ganar**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": 123, "cardId": 1001}' \
  http://localhost:3000/api/game/claim-free-prize
```

**Lógica:**
- Solo si `room = 'free_starter'`
- Ejecuta `dropRandomItem(userId)` automáticamente
- Selecciona cosmético aleatorio donde `is_free_available = true`

**Respuesta:**
```json
{
  "success": true,
  "prize": {
    "id": 5,
    "name": "Skin Ciberpunk Púrpura",
    "type": "card_skin",
    "rarity": "common",
    "description": "Diseño futurista con colores neón"
  }
}
```

---

## Backend - Servicios

### `inventoryService.js`

**Funciones Exportadas:**

```javascript
// 1. Obtener inventario completo
async getUserInventory(userId)
  ↳ SELECT * FROM user_inventory WHERE user_id = $1

// 2. Obtener catálogo de cosméticos
async getAvailableItems(type = null)
  ↳ SELECT * FROM cosmetic_items WHERE type = $1 (opcional)

// 3. Agregar item al inventario
async addItemToInventory(userId, itemId)
  ↳ INSERT INTO user_inventory... ON CONFLICT DO NOTHING
  ↳ Evita duplicados con constraint UNIQUE

// 4. Equipar cosmético
async equipItem(userId, itemId)
  ↳ BEGIN TRANSACTION
  ↳ UPDATE equipped_*_id en users
  ↳ UPDATE equipped = true en user_inventory
  ↳ COMMIT
  ↳ Transacción atómica

// 5. Desequipar cosmético
async unequipItem(userId, type)
  ↳ BEGIN TRANSACTION
  ↳ UPDATE equipped_*_id = NULL
  ↳ UPDATE equipped = false en user_inventory
  ↳ COMMIT

// 6. Drop Aleatorio
async dropRandomItem(userId)
  ↳ SELECT * FROM cosmetic_items WHERE is_free_available = true ORDER BY RANDOM() LIMIT 1
  ↳ INSERT item en user_inventory del usuario
  ↳ RETURN item data

// 7. Obtener equipados
async getEquippedItems(userId)
  ↳ SELECT equipped_avatar_frame_id, equipped_card_skin_id, etc.
  ↳ JOIN con cosmetic_items para detalles
  ↳ RETURN { avatar_frame: {...}, card_skin: {...}, ... }
```

---

### `gameController.js` - Nuevas Funciones

```javascript
// 1. buyCardFree(req, res)
//    - Valida: room = 'free_starter', limit = 20/día
//    - INSERT en daily_stock_cards con price = 0
//    - Auditoría: INSERT audit_revenue con amount = 0
//    - HTTP 400 si límite excedido

// 2. claimFreePrize(req, res)
//    - Valida: session.room = 'free_starter'
//    - Llama: inventoryService.dropRandomItem(userId)
//    - UPDATE session con winner info
//    - HTTP 200 con premio data
```

---

### `scheduler.js` - Job Cron Sala Starter

```javascript
// Job 4: Crear sesión Sala Starter a las 19:00 diariamente
cron.schedule('0 19 * * *', async () => {
  await this.createStarterSession();
});

// createStarterSession()
// 1. Check: ¿Ya existe sesión hoy?
// 2. INSERT en game_sessions:
//    - room = 'free_starter'
//    - status = 'pending'
//    - cost = 0
//    - current_pot_bingo/linea/jackpot = 0
// 3. INSERT 20 cartones automáticamente:
//    - generateBingoGrid() → grilla random 5x5
//    - INSERT en daily_stock_cards × 20
//    - price = 0, room = 'free_starter'
// 4. LOG: ✅ Sala Starter creada
```

---

## Frontend - Componentes

### 1. `InventoryScreen.jsx`
**Ubicación:** `client-player/src/pages/InventoryScreen.jsx`

**Funcionalidad:**
- Mostrar inventario del usuario por tipo (tabs)
- Botón "Equipar" / "Desequipar"
- Badge visual para items equipados
- Color de rareza codificado
- Indicador si tiene efecto de animación

**Props:**
```javascript
// No recibe props - Obtiene data de API

// State:
- items: []          // Todos los cosméticos del usuario
- equipped: {}       // Items equipados por tipo
- activeTab: 'avatar_frame'
- loading: false
- message: ''
```

**API Calls:**
```javascript
GET /api/inventory          // Cargar inventario
GET /api/inventory/equipped // Cargar equipados
POST /api/inventory/equip/:itemId
POST /api/inventory/unequip/:type
```

---

### 2. `LobbyPage.jsx`
**Ubicación:** `client-player/src/pages/LobbyPage.jsx`

**Funcionalidad:**
- Mostrar Sala Starter destacada (solo 19:00-20:00)
- Card con info: "GRATIS", "+X NFTs esta semana"
- Color distintivo: Verde/Celeste (#10B981, #22D3EE)
- Validar horario antes de permitir juego
- Listar otras salas disponibles

**Features:**
- Reloj en tiempo real (HH:MM:SS)
- Button "JUGAR AHORA - GRATIS" visible solo 19:00
- Mensaje "Disponible solo a las 19:00 hs" si está fuera de horario
- Contador: "+X premios NFT esta semana"

---

### 3. `GameRoom.jsx` - Modificaciones
**Ubicación:** `client-player/src/pages/GameRoom.jsx`

**Cambios:**
- Cargar `equippedSkin` al montar componente
- Pasar `equippedSkin` a componente `BingoCard`
- BingoCard aplica CSS dinámico según skin

**Lógica:**
```javascript
// 1. Al montar: GET /api/inventory/equipped
// 2. Si equipped.card_skin existe:
//    - Extraer: color_hex, animation_class
//    - Pasar a <BingoCard equippedSkin={...} />
// 3. BingoCard renderiza con estilos dinámicos
```

---

### 4. `BingoCard.jsx` - Nueva
**Ubicación:** `client-player/src/components/BingoCard.jsx`

**Props:**
```javascript
{
  gridNumbers,      // Array 5x5 de números
  cardNumber,       // Número serie del cartón
  isSelected,       // Si está seleccionado
  onSelect,         // Callback onClick
  equippedSkin      // { color_hex, animation_class, name }
}
```

**CSS Variables Dinámicas:**
```css
--card-primary-color: #22D3EE        // De color_hex del skin
--card-animation-class: cyberpunk    // De animation_class del skin
```

**Animaciones de Skin Soportadas:**
- `neon-glow` - Brillo pulsante
- `holographic` - Cambio de hue
- `cyberpunk` - Pulso colores alternos
- `diamond-sparkle` - Centelleo
- `fire-animation` - Llamas
- `matrix-rain` - Lluvia de caracteres
- `starfield` - Campo de estrellas

---

## Data Model - Cosméticos Seed

### Avatar Frames (Marcos)
| Nombre | Rarity | Efecto | Free? |
|--------|--------|--------|-------|
| Marco Azul Neón | Common | neon-glow | ✅ |
| Marco Fuego Rojo | Common | fire-animation | ✅ |
| Marco Diamante | Rare | diamond-sparkle | ✅ |
| Marco Espacio Negro | Rare | starfield | ✅ |
| Marco Legendario Oro | Legendary | holographic | ❌ |
| Marco Púrpura Mágico | Rare | magic-glow | ✅ |

### Card Skins
| Nombre | Rarity | Color | Free? |
|--------|--------|-------|-------|
| Ciberpunk Púrpura | Common | #A855F7 | ✅ |
| Print Animal | Common | #D4A574 | ✅ |
| Holográfico Oro | Rare | #FFD700 | ✅ |
| Mate Negro | Rare | #2D2D2D | ✅ |
| Neón Cian | Common | #00FFFF | ✅ |
| Legendario Cristal | Legendary | #E0E7FF | ❌ |
| Fuego Degradado | Rare | #FF6B35 | ✅ |
| Bioluminiscente | Rare | #39FF14 | ✅ |

### Chat Effects
| Nombre | Rarity | Efecto | Free? |
|--------|--------|--------|-------|
| Arcoíris | Common | rainbow-shift | ✅ |
| Código Binario | Common | binary-rain | ✅ |
| Matrix | Rare | matrix-rain | ✅ |
| Estrellas | Common | starfield | ✅ |
| Fuego Premium | Rare | fire-animation | ✅ |
| Legendario Auroras | Legendary | holographic | ❌ |
| Nieve | Common | none | ✅ |
| Electricidad | Rare | cyberpunk | ✅ |

### Badges
| Nombre | Rarity | Criterio | Free? |
|--------|--------|----------|-------|
| Ganador Free | Common | Ganar en Starter | ✅ |
| Maestro NFT | Rare | 5+ cosméticos | ❌ |
| Adoptante Temprano | Rare | Primeros jugadores | ❌ |
| Coleccionista | Rare | 10 premios | ❌ |
| Leyenda Viviente | Legendary | Todos los items | ❌ |
| Racha Ganadora | Common | 3 victorias seguidas | ✅ |
| Jugador Activo | Rare | 20+ sesiones | ❌ |
| Celebrador | Rare | Muro de la Fama | ❌ |

---

## Flujo de Usuario - Sala Starter

### 1. **Ingreso (19:00 hs)**
```
Usuario abre LobbyPage
  ↓ (Si es 19:00)
Ve card "SALA STARTER (GRATIS)"
  ↓ Click "JUGAR AHORA"
  ↓ navigate(/game/starter)
Entra a GameRoom
```

### 2. **Compra de Cartones Gratis**
```
POST /api/game/buy-card-free
  ↓ Validar: (horario, room, limit <= 20)
  ↓ INSERT daily_stock_cards × cantidad (price = 0)
  ↓ Retorna: cards[]
GameRoom recibe cartones
```

### 3. **Jugando**
```
Socket escucha números sorteados
BingoCard:
  - Aplica skin dinámico (si está equipado)
  - Marca números automáticamente
  - Valida: ¿Línea? ¿Bingo?
```

### 4. **Ganando Cosmético**
```
Socket emite: winner_detected
  ↓ Si es STARTER y usuario ganó
  ↓ POST /api/game/claim-free-prize
  ↓ Backend: dropRandomItem(userId)
  ↓ SELECT * FROM cosmetic_items 
     WHERE is_free_available = true 
     ORDER BY RANDOM() LIMIT 1
  ↓ INSERT en user_inventory
  ↓ Retorna: prize item
WinnerModal muestra: "¡Ganaste [COSMÉTICO]!"
```

### 5. **Gestionar Cosméticos**
```
Usuario va a /inventory
InventoryScreen:
  - GET /api/inventory → lista todos
  - POST /equip/:id → equipar
  - POST /unequip/:type → desequipar
Los cambios se ven en siguiente partida
```

---

## Archivos Creados/Modificados

### Backend
| Archivo | Estado | Cambios |
|---------|--------|---------|
| `server/schema.sql` | ✅ Actualizado | +cosmetic_items, user_inventory, campos users |
| `server/services/inventoryService.js` | ✅ Creado | 7 funciones completas |
| `server/controllers/inventoryController.js` | ✅ Creado | 5 endpoints |
| `server/routes/inventoryRoutes.js` | ✅ Creado | 5 rutas |
| `server/src/controllers/gameController.js` | ✅ Actualizado | +buyCardFree, +claimFreePrize |
| `server/src/routes/gameRoutes.js` | ✅ Actualizado | +2 routes |
| `server/src/index.js` | ✅ Actualizado | +inventoryRoutes |
| `server/src/services/scheduler.js` | ✅ Actualizado | +19:00 cron job |
| `server/cosmetics_seed.sql` | ✅ Creado | 32 cosméticos seed |

### Frontend
| Archivo | Estado | Cambios |
|---------|--------|---------|
| `client-player/src/pages/InventoryScreen.jsx` | ✅ Creado | Página completa inventario |
| `client-player/src/styles/InventoryScreen.css` | ✅ Creado | Estilos responsive |
| `client-player/src/pages/LobbyPage.jsx` | ✅ Creado | Lobby con Sala Starter |
| `client-player/src/styles/LobbyPage.css` | ✅ Creado | Estilos responsive |
| `client-player/src/pages/GameRoom.jsx` | ✅ Actualizado | +equippedSkin state/loading |
| `client-player/src/components/BingoCard.jsx` | ✅ Creado | Cartón con skins dinámicos |
| `client-player/src/styles/BingoCard.css` | ✅ Creado | Animaciones CSS |

---

## Testing Checklist

### Backend
- [ ] Job cron crea sesión a 19:00 exacto
- [ ] POST /buy-card-free valida limite 20
- [ ] POST /claim-free-prize genera drop aleatorio
- [ ] GET /inventory retorna todos los items
- [ ] POST /equip/:id actualiza equipped
- [ ] POST /unequip/:type limpia referencias
- [ ] dropRandomItem selecciona only is_free_available

### Frontend
- [ ] InventoryScreen carga inventario
- [ ] Botón Equipar/Desequipar funciona
- [ ] LobbyPage muestra Sala Starter 19:00
- [ ] LobbyPage oculta Sala Starter fuera de horario
- [ ] BingoCard aplica color dinámico del skin
- [ ] BingoCard aplica animación CSS

---

## Seeding Data

Ejecutar en base de datos:
```bash
psql -U user -d bingo_24k -f server/cosmetics_seed.sql
```

Verificar:
```sql
SELECT type, COUNT(*) FROM cosmetic_items GROUP BY type;
```

Esperado:
```
avatar_frame   | 6
badge          | 8
card_skin      | 8
chat_effect    | 8
```

---

## Rutas (Router Setup)

Agregar a `client-player/src/App.jsx` o router:
```javascript
import InventoryScreen from './pages/InventoryScreen';
import LobbyPage from './pages/LobbyPage';

// En <Routes>:
<Route path="/inventory" element={<InventoryScreen />} />
<Route path="/lobby" element={<LobbyPage />} />
// GameRoom ya existe en /game/:roomType
```

---

## Variables de Entorno

No requiere nuevas variables, pero validar:
```
DATABASE_URL=postgres://...
JWT_SECRET=...
PORT=3000
```

---

## Notas Importantes

1. **Sincronización Horaria:** El cron job depende de la zona horaria del servidor. Validar con `SELECT NOW();` en PostgreSQL.

2. **Atomicidad:** Las transacciones en equipItem/unequipItem garantizan consistency.

3. **Duplicados Previos:** UNIQUE(user_id, item_id) previene items duplicados.

4. **Animaciones:** Las clases CSS (neon-glow, cyberpunk, etc.) se aplican dinámicamente al cartón basadas en el skin equipado.

5. **Escalabilidad:** El sistema de cosméticos es extensible - agregar nuevos tipos solo requiere:
   - INSERT en cosmetic_items
   - Nuevo case en equipItem/unequipItem (si es tipo nuevo)
   - Nueva animación CSS (si es necesaria)

---

## Roadmap Futuro

- [ ] Tienda de cosméticos (intercambio de moneda por cosmética premium)
- [ ] Sistema de crafting (combinar 3 common → 1 rare)
- [ ] Leaderboard de coleccionistas
- [ ] Cosmetics "limitados por temporada"
- [ ] Preview 3D de skins
- [ ] Cosmetics dinámicos (cambian según hora/evento)

---

**Versión:** 1.0.0  
**Fecha:** 2024  
**Estado:** ✅ COMPLETADO
