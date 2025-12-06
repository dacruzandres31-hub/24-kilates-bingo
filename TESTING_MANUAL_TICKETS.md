# 🧪 GUÍA DE TESTING MANUAL - Sistema de Tickets v1.3.0

**Fecha:** Diciembre 5, 2025  
**Versión:** 1.3.0  
**Estado:** Listo para testing

---

## 🎯 OBJETIVO

Verificar que todos los endpoints y funcionalidades del sistema de Tickets funcionen correctamente antes del deployment.

---

## 📋 PRE-REQUISITOS

### 1. Base de Datos
```bash
# Ejecutar migration SQL primero
psql -U postgres -d bingo_24k -f "server/TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql"

# Verificar que las tablas fueron alteradas
psql -U postgres -d bingo_24k -c "\d cosmetic_items"
psql -U postgres -d bingo_24k -c "\d user_inventory"
```

**Esperado:**
- `cosmetic_items` tiene columnas: `is_consumable`, `max_uses`, `ticket_room`
- `user_inventory` tiene columnas: `quantity`, `is_consumable_type`
- Tabla `game_events` existe
- 3 tickets insertados (Bronce, Plata, Oro)

### 2. Servidor Backend
```bash
cd server
npm install
npm run dev
```

**Esperado:** Servidor corriendo en http://localhost:3000

### 3. Obtener Token JWT
```bash
# Login (ajusta credenciales según tu DB)
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

**Guardar el token para los siguientes tests**

---

## 🧪 TESTS DE ENDPOINTS

### TEST 1: Obtener Tickets del Usuario

**Endpoint:** `GET /api/shop/my-tickets`

```bash
curl -X GET http://localhost:3000/api/shop/my-tickets ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Esperado:**
```json
{
  "success": true,
  "tickets": [],
  "total": 0
}
```

**✅ PASS:** Si retorna estructura correcta  
**❌ FAIL:** Si error 401 (token inválido) o 500

---

### TEST 2: Comprar Cartón (Sin Tickets - Usa Dinero)

**Endpoint:** `POST /api/shop/buy-card`

**Pre-requisito:** Usuario debe tener balance > $5

```bash
curl -X POST http://localhost:3000/api/shop/buy-card ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"roomType\":\"bronce\",\"quantity\":1}"
```

**Esperado:**
```json
{
  "success": true,
  "message": "1 cartón comprado por $5.00",
  "paymentMethod": "cash",
  "newBalance": 45.00,
  "cardsAssigned": 1
}
```

**✅ PASS:** Si `paymentMethod === "cash"` y balance decrementado  
**❌ FAIL:** Si error de balance o room no encontrada

---

### TEST 3: Simular Premio LÍNEA

**Endpoint:** `POST /api/game/end-free-game`

**Pre-requisito:** Debe existir una sesión con `room='free_starter'`

#### Paso 3.1: Crear sesión de prueba
```sql
-- En psql:
INSERT INTO game_sessions (room, cost, max_players, status, start_time)
VALUES ('free_starter', 0, 100, 'pending', NOW());

-- Obtener el ID
SELECT id FROM game_sessions WHERE room='free_starter' ORDER BY id DESC LIMIT 1;
```

#### Paso 3.2: Llamar endpoint
```bash
curl -X POST http://localhost:3000/api/game/end-free-game ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"gameSessionId\":1,\"winType\":\"linea\"}"
```

**Esperado:**
```json
{
  "success": true,
  "message": "¡Ganaste un nuevo Marco!",
  "reward": {
    "type": "skin",
    "name": "Marco de Fuego",
    "rarity": "rare",
    "description": "avatar_frame rare"
  }
}
```

**✅ PASS:** Si retorna skin aleatorio (no legendario)  
**❌ FAIL:** Si error "No hay skins disponibles" (falta seed data)

---

### TEST 4: Simular Premio BINGO

**Endpoint:** `POST /api/game/end-free-game`

```bash
curl -X POST http://localhost:3000/api/game/end-free-game ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"gameSessionId\":1,\"winType\":\"bingo\"}"
```

**Esperado:**
```json
{
  "success": true,
  "message": "🎉 ¡BINGO! Ganaste una Skin Legendaria + 1 Cartón Gratis",
  "reward": {
    "type": "bingo_combo",
    "items": [
      { "type": "skin_legendary", "name": "Skin Legendaria Cristal" },
      { "type": "ticket_bronce", "name": "Ticket Sala Bronce", "quantity": 1 }
    ]
  }
}
```

**✅ PASS:** Si retorna skin legendaria + ticket  
**❌ FAIL:** Si no encuentra legendarias o tickets

---

### TEST 5: Verificar Ticket en Inventario

**Endpoint:** `GET /api/shop/my-tickets`

```bash
curl -X GET http://localhost:3000/api/shop/my-tickets ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Esperado (después de TEST 4):**
```json
{
  "success": true,
  "tickets": [
    {
      "id": 1,
      "name": "Ticket Sala Bronce",
      "ticket_room": "bronce",
      "rarity": "common",
      "quantity": 1
    }
  ],
  "total": 1
}
```

**✅ PASS:** Si `total >= 1` y ticket aparece  
**❌ FAIL:** Si total === 0 (no se insertó)

---

### TEST 6: Comprar Cartón con Ticket

**Endpoint:** `POST /api/shop/buy-card`

**Pre-requisito:** Usuario debe tener al menos 1 ticket (TEST 5)

```bash
curl -X POST http://localhost:3000/api/shop/buy-card ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"roomType\":\"bronce\",\"quantity\":1}"
```

**Esperado:**
```json
{
  "success": true,
  "message": "¡Cartón(es) canjeado(s) con Ticket! Te quedan 0 tickets",
  "paymentMethod": "ticket",
  "ticketsRemaining": 0,
  "cardsAssigned": 1
}
```

**✅ PASS:** Si `paymentMethod === "ticket"` y quantity decrementada  
**❌ FAIL:** Si usa dinero en lugar de ticket

---

### TEST 7: Consumir Ticket Manualmente

**Endpoint:** `POST /api/shop/consume-ticket`

**Pre-requisito:** Usuario debe tener tickets (repetir TEST 4 si es necesario)

```bash
curl -X POST http://localhost:3000/api/shop/consume-ticket ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"ticketType\":\"bronce\"}"
```

**Esperado:**
```json
{
  "success": true,
  "message": "Ticket bronce consumido. Te quedan: 0",
  "remaining": 0
}
```

**✅ PASS:** Si decrementó correctamente  
**❌ FAIL:** Si error "No tienes tickets"

---

## 📊 CHECKLIST DE VALIDACIÓN

### Funcionalidad Backend
- [ ] Migration SQL ejecutada sin errores
- [ ] Tablas alteradas correctamente
- [ ] 3 tickets insertados en cosmetic_items
- [ ] Endpoint `/my-tickets` retorna estructura correcta
- [ ] Endpoint `/buy-card` con dinero funciona
- [ ] Endpoint `/buy-card` con ticket funciona
- [ ] Endpoint `/end-free-game` con LÍNEA funciona
- [ ] Endpoint `/end-free-game` con BINGO funciona
- [ ] Tickets se acumulan correctamente (quantity++)
- [ ] Tickets se decrementan correctamente (quantity--)

### Validaciones de Negocio
- [ ] Solo funciona en Sala Bronce (tickets)
- [ ] Prioriza tickets sobre dinero
- [ ] LÍNEA da skin no-legendario
- [ ] BINGO da skin legendaria + ticket
- [ ] Balance no se decrementa si usa ticket
- [ ] Logging en game_events funciona

### Seguridad
- [ ] Todos los endpoints requieren JWT
- [ ] Error 401 sin token
- [ ] Validación de userId
- [ ] Transacciones SQL con ROLLBACK en error

---

## 🐛 TROUBLESHOOTING

### Error: "Column not found"
**Causa:** Migration SQL no ejecutada  
**Solución:** Ejecutar `TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql`

### Error: "No hay sesión activa para room"
**Causa:** No existe sesión con status='pending'  
**Solución:** Crear sesión manualmente o via scheduler

### Error: "No hay skins disponibles"
**Causa:** Tabla cosmetic_items vacía  
**Solución:** Ejecutar `cosmetics_seed.sql`

### Error: "No tienes tickets disponibles"
**Causa:** quantity = 0 o no existe en inventory  
**Solución:** Ejecutar TEST 4 para obtener ticket

### Error: 401 Unauthorized
**Causa:** Token JWT inválido o expirado  
**Solución:** Hacer login nuevamente

---

## 🎯 CRITERIOS DE ACEPTACIÓN

Para considerar el sistema **LISTO PARA PRODUCCIÓN**, todos estos deben pasar:

✅ **7/7 Tests de Endpoints** pasados  
✅ **10/10 Validaciones de Funcionalidad** pasadas  
✅ **6/6 Validaciones de Negocio** pasadas  
✅ **4/4 Validaciones de Seguridad** pasadas  

**Total: 27/27 Verificaciones**

---

## 📝 REGISTRO DE TESTS

### Test Ejecutado: _________
- Fecha: _________
- Resultado: [ ] PASS  [ ] FAIL
- Notas: _________________________________________

### Test Ejecutado: _________
- Fecha: _________
- Resultado: [ ] PASS  [ ] FAIL
- Notas: _________________________________________

---

## 🚀 PRÓXIMOS PASOS DESPUÉS DE TESTING

1. **Frontend Integration**
   - Crear/actualizar App.jsx con ruta `/shop`
   - Agregar link en navegación
   - Testing en browser

2. **QA Manual**
   - Testing en diferentes browsers
   - Testing en mobile
   - Testing de flujos completos

3. **Deployment**
   - Backup de base de datos
   - Ejecutar migration en producción
   - Deploy de código
   - Monitoring

---

**Versión:** 1.3.0  
**Última actualización:** Diciembre 5, 2025  
**Estado:** Ready for testing ✅
