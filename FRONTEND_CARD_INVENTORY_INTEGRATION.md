# 🎨 Frontend Card Inventory System - Documentación de Integración

## 📋 Resumen

Sistema completo de UI para la gestión de inventario de cartones v1.4.0, con tres componentes React listos para usar en **client-admin** y **client-player**.

---

## 🏗️ Componentes Implementados

### 1️⃣ CardInventoryPanel.jsx (SuperAdmin)

**Ubicación:** `client-admin/src/components/CardInventoryPanel.jsx`

**Funcionalidades:**
- ✅ Acreditar cartones (normales/regalo) a cualquier usuario
- ✅ Ver inventarios de todos los usuarios
- ✅ Ver detalle de inventario por usuario
- ✅ Transferir cartones entre usuarios
- ✅ Ver historial completo de movimientos
- ✅ Búsqueda de usuarios por ID o nombre
- ✅ Actualización en tiempo real

**Props:** Ninguno (componente standalone)

**Ejemplo de uso:**
```jsx
import CardInventoryPanel from '../components/CardInventoryPanel';

// En Dashboard.jsx
{activeSections['card-inventory'] && (
  <section className="mb-8">
    <SuperAdminOnly fallback={<AdminCardInventory />}>
      <CardInventoryPanel />
    </SuperAdminOnly>
  </section>
)}
```

**Endpoints utilizados:**
```javascript
POST   /api/superadmin/cards/credit           // Acreditar cartones
GET    /api/superadmin/cards/inventory/:userId // Ver inventario de usuario
GET    /api/superadmin/cards/movements/:userId // Ver movimientos
POST   /api/superadmin/cards/transfer         // Transferir cartones
GET    /api/superadmin/cards/all-inventories  // Ver todos los inventarios
```

**Características:**
- 3 tabs: Acreditar | Inventarios | Historial
- Formulario completo de acreditación con validaciones
- Tabla interactiva con filtros de búsqueda
- Modal de transferencia entre usuarios
- Vista detallada de inventario por sala
- Indicadores visuales de tipo de cartón (normal/regalo)
- Mensajes de éxito/error con iconos

---

### 2️⃣ AdminCardInventory.jsx (Admin/Cajero)

**Ubicación:** `client-admin/src/components/AdminCardInventory.jsx`

**Funcionalidades:**
- ✅ Ver mi inventario de cartones (total por sala)
- ✅ Transferir cartones a jugadores de mi red
- ✅ Ver historial de mis movimientos
- ✅ Indicadores de stock disponible

**Props:** Ninguno (componente standalone)

**Ejemplo de uso:**
```jsx
import AdminCardInventory from '../components/AdminCardInventory';

// El componente se muestra automáticamente para Admins/Cajeros
// cuando intentan acceder a la sección de inventario
<AdminCardInventory />
```

**Endpoints utilizados:**
```javascript
GET    /api/admin/cards/inventory    // Ver mi inventario
POST   /api/admin/cards/transfer     // Transferir a jugador
GET    /api/admin/cards/movements    // Ver mis movimientos
```

**Características:**
- 3 tabs: Mi Inventario | Transferir | Historial
- Resumen visual con total de cartones
- Vista por sala (bronce, plata, oro)
- Formulario de transferencia simplificado
- Stock disponible en tiempo real
- Historial con usuarios relacionados

**Diferencias vs SuperAdmin:**
- ❌ NO ve el campo `is_gift` (invisibilidad de cartones regalo)
- ❌ NO puede acreditar cartones (solo transferir lo que tiene)
- ❌ Solo ve SU inventario y movimientos
- ✅ Puede transferir a jugadores de su red

---

### 3️⃣ PlayerCardInventory.jsx (Jugador)

**Ubicación:** `client-player/src/components/PlayerCardInventory.jsx`

**Funcionalidades:**
- ✅ Ver mi inventario de cartones por sala
- ✅ Validar cartones para entrar a jugar
- ✅ Ver cartones ya validados para la sesión
- ✅ Indicador de límite 10% regalo

**Props:**
```typescript
interface PlayerCardInventoryProps {
  onCardsValidated?: (cards: any[]) => void; // Callback al validar
  showValidation?: boolean;                   // Mostrar botón validar
  sessionId?: number | null;                  // ID de sesión activa
  room?: 'bronce' | 'plata' | 'oro';         // Sala actual
}
```

**Ejemplo de uso:**
```jsx
import PlayerCardInventory from '../components/PlayerCardInventory';

// En sala de juego o lobby
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

**Endpoints utilizados:**
```javascript
GET    /api/game/my-inventory                // Ver mi inventario
POST   /api/game/validate-cards              // Validar cartones
GET    /api/game/my-validated-cards/:sessionId // Ver cartones validados
```

**Características:**
- 2 tabs: Inventario | Validados
- Vista compacta optimizada para mobile
- Validación de cartones (1-20)
- Indicador de sala actual
- Límite de 10% regalo explicado
- Lista de cartones validados con serial

**Diferencias vs Admin:**
- ❌ NO ve el campo `is_gift` (invisibilidad total)
- ✅ Puede VALIDAR cartones para jugar
- ✅ Ve solo SU inventario
- ✅ Interfaz simplificada para jugador

---

## 🔗 Integración con Dashboard

### client-admin/src/pages/Dashboard.jsx

**Cambios realizados:**

1. **Imports:**
```jsx
import CardInventoryPanel from '../components/CardInventoryPanel';
import AdminCardInventory from '../components/AdminCardInventory';
import { SuperAdminOnly } from '../components/ProtectedContent';
```

2. **Estado:**
```jsx
const [activeSections, setActiveSections] = useState({
  'estadisticas-generales': true,
  'usuarios': false,
  'card-inventory': false,  // ← NUEVO
  // ... otros
});
```

3. **Renderizado condicional:**
```jsx
{activeSections['card-inventory'] && (
  <section className="mb-8">
    <SuperAdminOnly fallback={<AdminCardInventory />}>
      <CardInventoryPanel />
    </SuperAdminOnly>
  </section>
)}
```

### client-admin/src/components/Sidebar.jsx

**Cambios realizados:**

```jsx
{
  id: 'card-inventory',
  title: '📦 Inventario de Cartones',
  icon: '📦',
  sections: []
},
```

---

## 🎨 Diseño y UX

### Paleta de Colores

**CardInventoryPanel (SuperAdmin):**
- Header: `from-purple-900/50 to-indigo-900/50`
- Botones: `from-purple-600 to-indigo-600`
- Tabs activos: `text-purple-400 border-purple-400`

**AdminCardInventory (Admin):**
- Header: `from-indigo-900/50 to-blue-900/50`
- Botones: `from-indigo-600 to-blue-600`
- Tabs activos: `text-indigo-400 border-indigo-400`

**PlayerCardInventory (Jugador):**
- Header: `from-blue-900/50 to-indigo-900/50`
- Botones: `from-green-600 to-emerald-600` (validar)
- Tabs activos: `text-blue-400 border-blue-400`

### Iconos (lucide-react)

- **Package**: Inventario general
- **Gift**: Cartones regalo
- **CreditCard**: Acreditar
- **Send**: Transferir
- **History**: Historial
- **Eye**: Ver detalle
- **PlayCircle**: Validar para jugar
- **CheckCircle**: Éxito
- **AlertCircle**: Error

### Estados de carga

Todos los componentes usan:
```jsx
{loading ? (
  <RefreshCw className="w-6 h-6 animate-spin" />
) : (
  // Contenido
)}
```

---

## 📊 Flujo de Datos

### SuperAdmin → Admin → Jugador

```
┌─────────────────────────────────────────────┐
│  SUPERADMIN (CardInventoryPanel)            │
│  - Acredita 100 cartones bronce a Admin1   │
│    (80 normales + 20 regalo)                │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│  ADMIN1 (AdminCardInventory)                │
│  - Ve: 100 cartones bronce                  │
│  - Transfiere 30 cartones a Jugador123     │
│    (24 normales + 6 regalo automático)      │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│  JUGADOR123 (PlayerCardInventory)           │
│  - Ve: 30 cartones bronce                   │
│  - Valida 10 cartones para jugar            │
│  - Sistema verifica límite 10% regalo       │
│  - Genera 10 seriales únicos                │
└─────────────────────────────────────────────┘
```

### Validación de Cartones

```jsx
// Jugador hace clic en "Validar y Jugar"
POST /api/game/validate-cards
{
  gameSessionId: 123,
  room: "bronce",
  quantity: 10
}

// Backend procesa:
1. Verifica inventario disponible: ✅ 30 cartones
2. Calcula proporción: 24 normales, 6 regalo
3. Toma 10 cartones: ~8 normales + ~2 regalo
4. Verifica límite 10% en sesión: ✅ OK
5. Genera seriales: BRONCE-123-1733951234-A1B2
6. Crea grillas 5x5 de bingo
7. Distribuye a jackpots (solo normales):
   - jackpot_linea += 8 * $10,000 * 0.15 = $12,000
   - jackpot_bingo += 8 * $10,000 * 0.50 = $40,000
   - jackpot_pre40 += 8 * $10,000 * 0.05 = $4,000
8. Reduce inventario: 30 → 20 cartones
9. Registra movimiento tipo "validated"

// Frontend recibe:
{
  validatedCount: 10,
  cards: [
    { id: 1, serial: "BRONCE-123-...", grid: [[1,2,3...]], contributed_amount: 10000 },
    { id: 2, serial: "BRONCE-123-...", grid: [[4,5,6...]], contributed_amount: 10000 },
    // ... 8 normales
    { id: 9, serial: "BRONCE-123-...", grid: [[7,8,9...]], contributed_amount: 0 },
    { id: 10, serial: "BRONCE-123-...", grid: [[10,11,12...]], contributed_amount: 0 }
    // ... 2 regalo (contributed_amount = 0)
  ]
}

// UI actualiza:
- Inventario: 30 → 20 cartones
- Tab "Validados": muestra 10 cartones
- Callback onCardsValidated() ejecuta
- Jugador listo para jugar
```

---

## 🧪 Testing

### Script de prueba PowerShell

**Archivo:** `test_frontend_inventory.ps1`

**Ejecutar:**
```powershell
cd "c:\Users\User\Documents\24 kilates"
.\test_frontend_inventory.ps1
```

**Tests incluidos:**
1. ✅ Login como SuperAdmin
2. ✅ Acreditar 20 cartones normales
3. ✅ Acreditar 5 cartones regalo
4. ✅ Consultar inventario de usuario
5. ✅ Ver todos los inventarios
6. ✅ Ver historial de movimientos
7. ✅ (Opcional) Login como Admin
8. ✅ Resumen de endpoints probados

**Output esperado:**
```
========================================
  TEST FRONTEND - INVENTARIO v1.4.0
========================================

[1/8] Login como SuperAdmin...
  ✅ Login exitoso
  Usuario: Andy
  Role: superadmin
  ID: 1

[2/8] Acreditar 20 cartones normales sala bronce a usuario 1...
  ✅ Acreditación exitosa
  Cantidad: 20
  Tipo: Normal
  Nuevo total: 20

...

✅ TODOS LOS TESTS COMPLETADOS!
```

---

## 🚀 Próximos Pasos

### Para Desarrolladores

1. **Iniciar servidor backend:**
```bash
cd server
npm start
```

2. **Iniciar cliente admin:**
```bash
cd client-admin
npm run dev
```

3. **Acceder a la UI:**
- URL: http://localhost:5174
- Login: Andy / Tasso2025 (SuperAdmin)
- Navegar: Sidebar → 📦 Inventario de Cartones

4. **Probar funcionalidades:**
- Acreditar cartones a un usuario
- Ver inventario completo
- Transferir entre usuarios
- Ver historial de movimientos

### Para QA

**Casos de prueba manuales:**

✅ **SuperAdmin Panel:**
1. Acreditar 10 cartones normales bronce a usuario X
2. Acreditar 5 cartones regalo plata a usuario X
3. Ver inventario de usuario X (debe mostrar ambos)
4. Transferir 3 cartones de usuario X a usuario Y
5. Verificar que la proporción se mantiene
6. Ver historial de usuario X (debe mostrar 3 movimientos)
7. Buscar usuario por ID en la tabla de inventarios
8. Ver detalle de un usuario específico

✅ **Admin Panel:**
1. Login como Admin
2. Ver mi inventario (debe mostrar total, NO regalo)
3. Transferir 5 cartones a un jugador
4. Ver historial (debe mostrar la transferencia)
5. Intentar transferir más de lo disponible (debe dar error)

✅ **Player Panel:**
1. Login como Jugador
2. Ver mi inventario (debe mostrar total, NO regalo)
3. Entrar a sala bronce con sesión activa
4. Validar 10 cartones
5. Ver tab "Validados" (debe mostrar 10 cartones con serial)
6. Verificar que inventario se redujo en 10

---

## 🐛 Troubleshooting

### Error: "Cannot find module '../db'"

**Solución:** Ya resuelto. Los archivos usan `require('../db')` en lugar de `require('../config/database')`.

### Error: "401 Unauthorized"

**Causa:** Token expirado o inválido.

**Solución:**
```javascript
// Hacer logout y login nuevamente
localStorage.removeItem('adminToken');
window.location.href = '/login';
```

### Error: "No tienes suficientes cartones"

**Causa:** Intentando transferir más cartones de los disponibles.

**Solución:** Verificar inventario antes de transferir:
```javascript
const available = inventory.find(i => i.room === 'bronce')?.total_cards || 0;
if (quantity > available) {
  alert(`Solo tienes ${available} cartones disponibles`);
}
```

### Error: "Límite del 10% de cartones de regalo alcanzado"

**Causa:** La sesión ya tiene 10% o más de cartones regalo validados.

**Solución:** Esperar a la próxima sesión o validar solo cartones normales.

---

## 📝 Checklist de Integración

### Backend ✅ (Completado)
- [x] 11 endpoints API funcionando
- [x] Validación de límite 10% regalo
- [x] Generación de seriales únicos
- [x] Distribución de jackpots
- [x] Auditoría de movimientos
- [x] Tests PowerShell exitosos

### Frontend ✅ (Completado)
- [x] CardInventoryPanel.jsx (SuperAdmin)
- [x] AdminCardInventory.jsx (Admin)
- [x] PlayerCardInventory.jsx (Jugador)
- [x] Integración en Dashboard
- [x] Actualización de Sidebar
- [x] Sistema de permisos (SuperAdminOnly)

### Documentación ✅ (Completado)
- [x] README del sistema
- [x] Guía de integración (este documento)
- [x] Script de testing
- [x] Ejemplos de uso

### Próximo ⏳
- [ ] Tests E2E automatizados
- [ ] Integración con salas de juego
- [ ] Animaciones y transiciones
- [ ] Optimización de performance
- [ ] Deployment a producción

---

## 📞 Soporte

**Documentos relacionados:**
- `CARD_INVENTORY_SYSTEM_README.md` - Guía completa del sistema
- `CARD_INVENTORY_MIGRATION_SUMMARY.md` - Detalles técnicos de BD
- `CHANGELOG_CARD_INVENTORY_v1.4.0.md` - Changelog de la versión
- `test_frontend_inventory.ps1` - Script de pruebas

**Archivos de código:**
- Backend: `server/src/controllers/cardInventoryController.js`
- Servicio: `server/src/services/cardInventoryService.js`
- SuperAdmin UI: `client-admin/src/components/CardInventoryPanel.jsx`
- Admin UI: `client-admin/src/components/AdminCardInventory.jsx`
- Player UI: `client-player/src/components/PlayerCardInventory.jsx`

---

**Última actualización:** 2025-12-11  
**Versión:** v1.4.0  
**Estado:** ✅ Producción Ready
