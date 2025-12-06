# 🚀 Guía Rápida de Instalación - Sistema de Tickets v1.3.0

## ⚡ Instalación en 3 Minutos

### Opción 1: Instalación Automática (Recomendada)

```powershell
cd server
.\install_tickets_system.ps1
```

El script te pedirá:
1. Contraseña de PostgreSQL
2. Confirmación para continuar

✅ **El script automáticamente:**
- Verifica que PostgreSQL esté instalado
- Ejecuta la migración de tickets
- Inserta los cosméticos necesarios
- Verifica que todo funcione correctamente

---

### Opción 2: Instalación Manual

#### Paso 1: Migración de Base de Datos
```bash
cd server
psql -U postgres -d bingo_24k -f TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql
```

#### Paso 2: Insertar Cosméticos (si no existen)
```bash
psql -U postgres -d bingo_24k -f cosmetics_seed.sql
```

#### Paso 3: Verificar instalación
```bash
psql -U postgres -d bingo_24k -c "SELECT name FROM cosmetic_items WHERE type='ticket';"
```

**Resultado esperado:**
```
           name           
--------------------------
 Ticket Bronce Gratuito
 Ticket Plata Gratuito
 Ticket Oro Gratuito
```

---

## 🧪 Testing Rápido

### 1. Iniciar Backend
```bash
cd server
npm run dev
```

### 2. Obtener Token JWT
```bash
curl -X POST http://localhost:3001/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"test\",\"password\":\"test123\"}"
```

**Guarda el token en una variable:**
```cmd
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Test Básico: Listar Tickets
```bash
curl -X GET http://localhost:3001/api/shop/my-tickets ^
  -H "Authorization: Bearer %TOKEN%"
```

**Resultado esperado:**
```json
{
  "success": true,
  "tickets": []
}
```

### 4. Test Completo
Ver archivo: `TESTING_MANUAL_TICKETS.md` para los 7 tests completos

---

## 📋 Checklist de Instalación

- [ ] PostgreSQL instalado y ejecutándose
- [ ] Base de datos `bingo_24k` existe
- [ ] Script de migración ejecutado sin errores
- [ ] 3 tickets insertados en `cosmetic_items`
- [ ] Tabla `game_events` creada
- [ ] Columnas `is_consumable`, `max_uses`, `ticket_room` agregadas a `cosmetic_items`
- [ ] Columnas `quantity`, `is_consumable_type` agregadas a `user_inventory`
- [ ] Backend iniciado sin errores
- [ ] Endpoint `/api/shop/my-tickets` responde correctamente

---

## 🔥 Quick Commands

### Ver tickets en DB
```bash
psql -U postgres -d bingo_24k -c "SELECT id, name, type, rarity, is_consumable, ticket_room FROM cosmetic_items WHERE type='ticket';"
```

### Ver columnas nuevas en cosmetic_items
```bash
psql -U postgres -d bingo_24k -c "\d cosmetic_items"
```

### Ver columnas nuevas en user_inventory
```bash
psql -U postgres -d bingo_24k -c "\d user_inventory"
```

### Ver eventos de juego
```bash
psql -U postgres -d bingo_24k -c "SELECT * FROM game_events ORDER BY created_at DESC LIMIT 10;"
```

---

## 🆘 Solución de Problemas

### Error: "psql: command not found"
**Solución:** Agrega PostgreSQL al PATH:
```powershell
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"
```

### Error: "relation 'game_events' already exists"
**Causa:** Ya ejecutaste la migración anteriormente  
**Solución:** Está bien, continúa con los siguientes pasos

### Error: "duplicate key value violates unique constraint"
**Causa:** Los tickets ya fueron insertados  
**Solución:** Está bien, ya tienes los datos necesarios

### Error: "column 'is_consumable' does not exist"
**Causa:** La migración no se ejecutó correctamente  
**Solución:** Ejecuta la migración nuevamente:
```bash
psql -U postgres -d bingo_24k -f TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql
```

---

## 🔄 Rollback (Revertir Cambios)

Si necesitas revertir TODOS los cambios:

```bash
psql -U postgres -d bingo_24k -f ROLLBACK_TICKETS.sql
```

⚠️ **ADVERTENCIA:** Esto eliminará:
- Tabla `game_events` (todos los eventos)
- Tabla `user_tickets` (historial de tickets)
- Columnas nuevas en `cosmetic_items` y `user_inventory`
- Todos los tickets insertados

---

## 📚 Documentación Completa

- **Guía Técnica:** `TICKETS_PREMIOS_HIBRIDOS.md`
- **Guía de Integración:** `TICKETS_INTEGRACION_GUIA.md`
- **Testing Manual:** `TESTING_MANUAL_TICKETS.md`
- **Changelog:** `CHANGELOG_TICKETS_v1.3.0.md`
- **Resumen Ejecutivo:** `TICKETS_RESUMEN_EJECUTIVO.md`

---

## ✅ Estado de Implementación

### Backend (100%)
- ✅ `shopController.js` - 4 funciones
- ✅ `shopRoutes.js` - 3 endpoints
- ✅ `gameController.js` - `end_free_game()` modificado
- ✅ `gameRoutes.js` - Ruta `/end-free-game` agregada
- ✅ `index.js` - `shopRoutes` registrado

### Frontend (100%)
- ✅ `ShopScreen.jsx` - Interfaz de compra
- ✅ `ShopScreen.css` - Estilos responsive
- ⚠️ Ruta pendiente de registrar en routing file

### Base de Datos (0%)
- ❌ Migración NO ejecutada (ejecutar ahora)
- ❌ Cosméticos NO insertados (ejecutar ahora)

### Testing (0%)
- ❌ Tests de endpoints pendientes
- ❌ Tests de interfaz pendientes

---

## 🎯 Siguiente Paso

**Ejecuta el instalador:**
```powershell
cd server
.\install_tickets_system.ps1
```

O si prefieres manual:
```bash
psql -U postgres -d bingo_24k -f TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql
```

Luego revisa `TESTING_MANUAL_TICKETS.md` para ejecutar los tests.

---

**Versión:** 1.3.0  
**Fecha:** 2025-01-02  
**Autor:** GitHub Copilot
