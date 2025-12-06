# 🚀 SALA STARTER - QUICK START GUIDE

## ¿Qué es Sala Starter?

**Sala Starter** es un módulo Free-to-Play que se abre a las **19:00 hs diariamente**. Los jugadores pueden:
- 🎁 Jugar **20 cartones GRATIS**
- 🏅 Ganar **cosméticos NFT** (no dinero)
- ✨ Equipar skins para personalizar su experiencia

---

## 📦 IMPLEMENTACIÓN RÁPIDA

### PASO 1: Insertar Datos en Base de Datos

```bash
# Conectarse a PostgreSQL
psql -U postgres -d bingo_24k

# Ejecutar seed de cosméticos
\i server/cosmetics_seed.sql

# Verificar
SELECT type, COUNT(*) FROM cosmetic_items GROUP BY type;
```

**Esperado:**
```
avatar_frame   | 6
badge          | 8
card_skin      | 8
chat_effect    | 8
```

---

### PASO 2: Actualizar Rutas en Frontend (Router)

Si usas React Router, agregar a tu `App.jsx` o router config:

```javascript
import InventoryScreen from './pages/InventoryScreen';
import LobbyPage from './pages/LobbyPage';

// En tu <Routes>:
<Route path="/inventory" element={<InventoryScreen />} />
<Route path="/lobby" element={<LobbyPage />} />
// GameRoom ya existe, simplemente aceptará:
// /game/starter para la Sala Starter
```

---

### PASO 3: Navegar en Aplicación

1. **Acceso desde Lobby** (19:00-20:00)
   ```
   LobbyPage → Click "SALA STARTER (GRATIS)" → /game/starter
   ```

2. **Gestionar Cosméticos**
   ```
   Click 🎁 Inventario → InventoryScreen → Equipar/Desequipar
   ```

3. **Ver Skins en Partida**
   ```
   GameRoom automáticamente aplica skin si está equipado
   ```

---

## 🔧 VERIFICACIÓN DE SETUP

### Backend - Endpoints

```bash
# 1. Obtener inventario (vacío si es primer usuario)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/inventory

# 2. Obtener catálogo de cosméticos
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/inventory/available

# 3. Obtener equipados (null si ninguno)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/inventory/equipped

# 4. Comprar cartón gratis (test)
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 1}' \
  http://localhost:3000/api/game/buy-card-free
```

### Frontend - Componentes

- [ ] InventoryScreen carga sin errores
- [ ] LobbyPage muestra Sala Starter a las 19:00
- [ ] BingoCard renderiza con colores dinámicos
- [ ] Mensajes de éxito/error aparecen correctamente

### Scheduler - Cron Job

```bash
# En logs del servidor, a las 19:00 deberías ver:
# [Scheduler] ✅ Sala Starter creada: Sesión #123 con 20 cartones gratuitos

# Para testing, puedes simular manualmente en psql:
SELECT * FROM game_sessions WHERE room = 'free_starter' AND play_date = TODAY();
```

---

## 💾 ARCHIVOS CLAVE

| Archivo | Propósito | Tipo |
|---------|-----------|------|
| `server/schema.sql` | Database schema | Database |
| `server/cosmetics_seed.sql` | Seed data cosméticos | Database |
| `server/services/inventoryService.js` | Lógica de cosméticos | Backend |
| `server/controllers/inventoryController.js` | API handlers | Backend |
| `server/routes/inventoryRoutes.js` | Rutas inventory | Backend |
| `server/src/services/scheduler.js` | Cron job 19:00 | Backend |
| `client-player/src/pages/InventoryScreen.jsx` | Gestor cosmético | Frontend |
| `client-player/src/pages/LobbyPage.jsx` | Lobby con Starter | Frontend |
| `client-player/src/components/BingoCard.jsx` | Cartón con skins | Frontend |

---

## 🎨 COSMÉTICOS DISPONIBLES

### Marcos Avatar (6)
- Marco Azul Neón (common)
- Marco Fuego Rojo (common)
- Marco Diamante (rare)
- Marco Espacio Negro (rare)
- Marco Legendario Oro (legendary)
- Marco Púrpura Mágico (rare)

### Skins Cartón (8)
- Cyberpunk Púrpura (common)
- Print Animal (common)
- Holográfico Oro (rare)
- Mate Negro (rare)
- Neón Cian (common)
- Legendario Cristal (legendary)
- Fuego Degradado (rare)
- Bioluminiscente (rare)

### Efectos Chat (8)
- Arcoíris (common)
- Código Binario (common)
- Matrix (rare)
- Estrellas (common)
- Fuego Premium (rare)
- Legendario Auroras (legendary)
- Nieve (common)
- Electricidad (rare)

### Insignias (8)
- Ganador Free (common)
- Maestro NFT (rare)
- Adoptante Temprano (rare)
- Coleccionista (rare)
- Leyenda Viviente (legendary)
- Racha Ganadora (common)
- Jugador Activo (rare)
- Celebrador (rare)

---

## ⏰ HORARIOS

### Sala Starter
- **Abierto:** 19:00 (7 PM)
- **Cierra:** 20:00 (8 PM)
- **Frecuencia:** Diariamente
- **Límite:** 20 cartones/usuario/día
- **Costo:** $0 (GRATIS)
- **Premios:** Cosméticos (50% common, 40% rare, 10% legendary)

---

## 🔐 VALIDACIONES

### Compra de Cartones
- ✅ Solo en room='free_starter'
- ✅ Máximo 20 cartones por usuario por día
- ✅ Costo siempre = $0
- ✅ No se descuenta balance

### Premios
- ✅ Solo si ganaste (bingo o línea)
- ✅ Solo en room='free_starter'
- ✅ Cosmético seleccionado de is_free_available=true
- ✅ Agregado automáticamente al inventario

### Cosméticos
- ✅ No puede haber duplicados (UNIQUE constraint)
- ✅ Solo puede equiparse un item por tipo
- ✅ Equipado = true solo en una copia
- ✅ Al desequipar, equipped = false

---

## 🐛 TROUBLESHOOTING

### Error: "Sala Starter no disponible"
**Causa:** No es 19:00 hs  
**Solución:** Espera a las 19:00 o testa con reloj ajustado

### Error: "No tienes cartones disponibles"
**Causa:** Ya compraste 20 hoy  
**Solución:** Intenta mañana

### Error: "Cannot read property 'animation_class' of null"
**Causa:** Skin no equipado correctamente  
**Solución:** Verifica que POST /equip retorna item completo

### Skins no se ven en GameRoom
**Causa:** GameRoom no cargó equipped skins  
**Solución:** Verifica GET /api/inventory/equipped retorna data

---

## 📞 SOPORTE

### Logs Útiles

```bash
# Backend - Scheduler
tail -f server.log | grep "Sala Starter"

# Frontend - Console
console.log(equippedSkin)  // Debe ver objeto con color_hex

# Database - Verificar data
SELECT * FROM cosmetic_items LIMIT 5;
SELECT * FROM user_inventory WHERE user_id = 1;
SELECT equipped_card_skin_id FROM users WHERE id = 1;
```

---

## 📚 DOCUMENTACIÓN COMPLETA

Para documentación técnica detallada, ver:
- **SALA_STARTER_DOCUMENTATION.md** (850+ líneas)
- **CHANGELOG_v1.2.0.md** (400+ líneas)

---

## ✅ CHECKLIST DE LANZAMIENTO

- [ ] Database: SQL seed ejecutado
- [ ] Backend: inventoryService y controller creados
- [ ] Backend: gameController actualizado con buyCardFree/claimFreePrize
- [ ] Backend: scheduler.js tiene cron 19:00
- [ ] Frontend: InventoryScreen agregada a rutas
- [ ] Frontend: LobbyPage agregada a rutas
- [ ] Frontend: BingoCard renderiza con equippedSkin
- [ ] API: GET /api/inventory retorna items
- [ ] API: GET /api/inventory/available retorna 32 items
- [ ] API: POST /api/inventory/equip/:id funciona
- [ ] API: POST /api/game/buy-card-free funciona
- [ ] Scheduler: Cron ejecuta a las 19:00
- [ ] Testing: Manual a las 19:00
- [ ] Documentación: Links actualizados

---

**Versión:** 1.2.0  
**Última Actualización:** 2024  
**Estado:** ✅ LISTA PARA LANZAMIENTO
