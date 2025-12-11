# 🚀 Guía Rápida - Probar Frontend Card Inventory

## ⚡ Inicio Rápido (5 minutos)

### 1️⃣ Iniciar Backend

```powershell
# Terminal 1 - Servidor Backend
cd "c:\Users\User\Documents\24 kilates\server"
npm start
```

**Verificar:**
```
✅ Server running on port 3001
✅ Connected to MySQL bingo_24k
✅ 6 cron jobs registered
```

---

### 2️⃣ Iniciar Cliente Admin

```powershell
# Terminal 2 - Cliente Admin
cd "c:\Users\User\Documents\24 kilates\client-admin"
npm run dev
```

**Verificar:**
```
✅ VITE v5.0.0  ready in XXX ms
✅ Local: http://localhost:5174/
```

---

### 3️⃣ Acceder a la UI

**URL:** http://localhost:5174

**Login:**
- Usuario: `Andy`
- Contraseña: `Tasso2025`

---

### 4️⃣ Navegar al Inventario

1. ✅ Iniciar sesión
2. ✅ En el Sidebar, hacer clic en **📦 Inventario de Cartones**
3. ✅ El panel se carga automáticamente

---

## 🧪 Pruebas Funcionales

### ✅ Test 1: Acreditar Cartones (SuperAdmin)

**Tab:** Acreditar Cartones

1. Ingresar **ID de Usuario**: `1` (tu propio ID)
2. Seleccionar **Sala**: `Bronce`
3. Ingresar **Cantidad**: `20`
4. Seleccionar **Tipo**: `Normal` ⚪
5. (Opcional) **Razón**: `Test inicial`
6. Click **Acreditar Cartones**

**Resultado esperado:**
```
✅ 20 cartones normales acreditados. Nuevo total: 20
```

---

### ✅ Test 2: Acreditar Cartones Regalo

**Tab:** Acreditar Cartones

1. Ingresar **ID de Usuario**: `1`
2. Seleccionar **Sala**: `Bronce`
3. Ingresar **Cantidad**: `5`
4. Seleccionar **Tipo**: `Regalo` 🎁
5. (Opcional) **Razón**: `Promoción especial`
6. Click **Acreditar Cartones**

**Resultado esperado:**
```
✅ 5 cartones regalo acreditados. Nuevo total: 25
```

---

### ✅ Test 3: Ver Inventario de Usuario

**Tab:** Ver Inventarios

1. (Opcional) Buscar por nombre o ID
2. Ver tabla con todos los inventarios
3. Click en **👁️ Ver detalle** de un usuario

**Resultado esperado:**
- Tabla con columnas: Usuario, Sala, Normales, Regalo, Total
- Vista detallada con separación por sala
- Valores correctos: 20 normales + 5 regalo = 25 total

---

### ✅ Test 4: Transferir Cartones

**Tab:** Ver Inventarios

1. Click en botón **Transferir**
2. **ID Usuario Origen**: `1`
3. **ID Usuario Destino**: `2` (o cualquier otro usuario)
4. **Sala**: `Bronce`
5. **Cantidad**: `10`
6. (Opcional) **Razón**: `Test de transferencia`
7. Click **Transferir**

**Resultado esperado:**
```
✅ 8 normales + 2 regalo transferidos
```

**Verificar:**
- Usuario origen: 25 → 15 cartones
- Usuario destino: 0 → 10 cartones

---

### ✅ Test 5: Ver Historial

**Tab:** Historial

1. Ingresar **ID de Usuario**: `1`
2. Click **Buscar**

**Resultado esperado:**
- Lista de 3 movimientos:
  - ➕ CREDIT - 20 cartones (Bronce) - Normal
  - ➕ CREDIT - 5 cartones (Bronce) - Regalo
  - ⬆️ TRANSFER_OUT - 10 cartones (Bronce) - Mixed

---

## 🔄 Probar como Admin (Opcional)

### Crear un Admin

1. Logout de SuperAdmin
2. En SuperAdmin, crear usuario con rol `agente`
3. Login con las credenciales del nuevo admin

### Ver Panel Admin

**Tab:** Mi Inventario

- ✅ Solo ve **total** de cartones (NO separación normal/regalo)
- ✅ Vista por sala (bronce, plata, oro)

**Tab:** Transferir

- ✅ Puede transferir a jugadores de su red
- ✅ Formulario simplificado

**Tab:** Historial

- ✅ Solo ve SUS movimientos
- ✅ No ve movimientos de otros usuarios

---

## 🎮 Probar como Jugador (Futuro)

### Integración en GameRoom

**Archivo a modificar:** `client-player/src/pages/GameRoom.jsx`

**Ejemplo de integración:**

```jsx
import PlayerCardInventory from '../components/PlayerCardInventory';

// En el componente
<PlayerCardInventory
  sessionId={currentSessionId}
  room="bronce"
  showValidation={true}
  onCardsValidated={(cards) => {
    console.log(`${cards.length} cartones validados!`);
    setMyCards(cards);
  }}
/>
```

**Flujo:**
1. Jugador entra a sala
2. Ve su inventario disponible
3. Valida 10 cartones
4. Cartones se restan del inventario
5. Se crean 10 seriales únicos
6. Jugador listo para jugar

---

## 📊 Verificación en Base de Datos

### Ver inventarios

```sql
SELECT * FROM user_card_inventory 
WHERE user_id = 1;
```

**Resultado esperado:**
```
user_id | room   | normal_cards | gift_cards
--------|--------|--------------|------------
1       | bronce | 12           | 3
```

### Ver cartones validados

```sql
SELECT * FROM validated_cards 
WHERE game_session_id = 123;
```

**Resultado esperado:**
```
id | serial                  | contributed_amount | grid
---|-------------------------|--------------------|---------
1  | BRONCE-123-1733951234-A1B2 | 10000         | [[1,2,3...]]
2  | BRONCE-123-1733951235-C3D4 | 10000         | [[4,5,6...]]
...
10 | BRONCE-123-1733951244-Z9Y8 | 0             | [[30,31,32...]]
```

### Ver movimientos

```sql
SELECT * FROM card_movements_log 
WHERE user_id = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Error: "Cannot connect to server"

**Solución:**
```powershell
# Verificar que el servidor esté corriendo
netstat -ano | findstr :3001

# Si no hay respuesta, reiniciar servidor
cd server
npm start
```

### Error: "401 Unauthorized"

**Solución:**
1. Hacer logout
2. Limpiar localStorage
3. Login nuevamente

### Error: "No tienes suficientes cartones"

**Solución:**
1. Verificar inventario en tab "Inventarios"
2. Acreditar más cartones si es necesario
3. Verificar que la sala sea correcta

### Componente no se muestra

**Solución:**
```powershell
# Verificar que los archivos existen
dir "client-admin\src\components\CardInventoryPanel.jsx"
dir "client-admin\src\components\AdminCardInventory.jsx"

# Reiniciar Vite dev server
Ctrl+C
npm run dev
```

---

## ✅ Checklist de Verificación

### Backend
- [ ] Servidor corriendo en puerto 3001
- [ ] Conexión a MySQL exitosa
- [ ] 6 cron jobs registrados

### Frontend
- [ ] Cliente admin corriendo en puerto 5174
- [ ] Login exitoso como SuperAdmin
- [ ] Sidebar muestra "📦 Inventario de Cartones"

### Funcionalidades SuperAdmin
- [ ] Puede acreditar cartones normales
- [ ] Puede acreditar cartones regalo
- [ ] Puede ver inventarios de todos los usuarios
- [ ] Puede transferir entre usuarios
- [ ] Puede ver historial de movimientos
- [ ] Búsqueda de usuarios funciona

### Funcionalidades Admin
- [ ] Solo ve total (no separación normal/regalo)
- [ ] Puede transferir a jugadores
- [ ] Ve solo su historial

### Base de Datos
- [ ] Registros en `user_card_inventory`
- [ ] Registros en `card_movements_log`
- [ ] Proporción normal/regalo se mantiene

---

## 📞 Comandos Útiles

### Limpiar y reiniciar

```powershell
# Matar procesos Node.js
taskkill /F /IM node.exe

# Reiniciar servidor
cd server
npm start

# Reiniciar cliente admin
cd client-admin
npm run dev
```

### Ver logs en tiempo real

```powershell
# En servidor (terminal con colores)
npm start

# Filtrar logs específicos
npm start | findstr "Inventario"
```

### Testing rápido

```powershell
# Script automático
cd "c:\Users\User\Documents\24 kilates"
.\test_frontend_inventory.ps1
```

---

## 🎉 Siguiente Paso

**Una vez verificado el frontend:**

```powershell
# Hacer commit
git add .
git commit -m "feat: Frontend Sistema de Inventario de Cartones v1.4.0"
git push origin main
```

---

**Última actualización:** 2025-12-11  
**Versión:** v1.4.0  
**Tiempo estimado de prueba:** 15-20 minutos
