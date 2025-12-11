# Changelog - 11 de Diciembre 2025

## 🎯 Resumen de Cambios

### 1. Sistema de Salas de Regalo (SuperAdmin Only)

#### Base de Datos
- ✅ Agregadas 3 nuevas salas de regalo a ENUMs:
  - `bronce_regalo`
  - `plata_regalo`
  - `oro_regalo`
- ✅ Tablas modificadas:
  - `user_cards`: ENUM actualizado con salas de regalo
  - `daily_stock_cards`: ENUM actualizado con salas de regalo

#### Backend - Nuevas Funciones SuperAdmin
**Archivo**: `server/src/controllers/superAdminController.js`

1. **`getStockSummary()`** - GET `/api/superadmin/stock/summary`
   - Obtiene resumen de stock por sala
   - Separa salas normales de salas de regalo
   - Retorna: `{ normal: [], regalo: [], total: [] }`

2. **`generateStock()`** - POST `/api/superadmin/stock/generate`
   - Genera cartones automáticamente para una sala
   - Validación: Solo SuperAdmin puede generar salas de regalo
   - Cartones de regalo tienen precio = 0
   - Body: `{ room, quantity, playDate, playTime }`

3. **`getUserStock()`** - GET `/api/superadmin/stock/user/:userId`
   - Consulta stock disponible de un Admin/Agente
   - Incluye todas las salas (normales + regalo)

4. **`transferStock()`** - POST `/api/superadmin/stock/transfer`
   - Transfiere cartones del SuperAdmin a Admin/Agente
   - Validación: Solo SuperAdmin puede transferir salas de regalo
   - Body: `{ targetUserId, room, quantity }`

#### Rutas API
**Archivo**: `server/src/routes/superAdminRoutes.js`
- GET `/api/superadmin/stock/summary`
- POST `/api/superadmin/stock/generate`
- GET `/api/superadmin/stock/user/:userId`
- POST `/api/superadmin/stock/transfer`

Todas protegidas con: `authenticateToken → isAdmin → requireSuperAdmin`

#### Características Especiales
- 🎁 **Exclusivo SuperAdmin**: Solo Andy puede generar y transferir cartones de regalo
- 💰 **Precio 0**: Los cartones de regalo no tienen costo
- 📝 **Auditoría diferenciada**: Registros en `gift_movements` con razón "Stock de REGALO"
- 🏷️ **Mensajes especiales**: Etiquetas "BRONCE REGALO", "PLATA REGALO", "ORO REGALO"
- 🔒 **Validación de permisos**: 403 Forbidden si un admin regular intenta acceder

---

### 2. Filtrado de Jerarquía de Usuarios

#### Backend
**Archivo**: `server/src/controllers/adminController.js`

**Función modificada**: `getUsersHierarchy()`
- ✅ El usuario actual **NO aparece** en el listado de usuarios
- ✅ Solo se muestran usuarios descendentes en la jerarquía
- ✅ Consulta SQL: `WHERE id != ?` para excluir al usuario logueado
- ✅ Árbol construido desde `currentUserId` hacia abajo

**Beneficio**: Cada admin/agente solo ve su red de usuarios subordinados, sin verse a sí mismo en la lista.

---

### 3. Scripts de Inicio Automático

**Archivos creados en raíz del proyecto**:

1. **`INICIAR_SERVIDOR.bat`**
   - Inicia solo el servidor backend (puerto 3001)
   - Color verde en terminal

2. **`INICIAR_PANEL_ADMIN.bat`**
   - Inicia solo el panel de administración (puerto 5174)
   - Color azul en terminal

3. **`INICIAR_TODO.bat`** ⭐ **(RECOMENDADO)**
   - Inicia automáticamente servidor + panel de admin
   - Abre 2 ventanas separadas
   - Espera 5 segundos entre inicios
   - Muestra URLs de acceso

**Uso**: Doble clic en `INICIAR_TODO.bat` para iniciar todo el sistema.

---

### 4. Migración de Base de Datos

**Archivo**: `server/MIGRATION_SALAS_REGALO.sql`
- Script SQL para agregar columnas de salas de regalo
- Documenta cambios en estructura de tablas
- Incluye verificaciones de estructura

---

### 5. Scripts de Testing

**Archivo**: `test_stock_regalo_simple.ps1`
- Test automatizado del sistema de stock con regalo
- Verifica:
  - Login de SuperAdmin
  - Generación de stock de regalo
  - Consulta de resumen
  - Transferencias de stock

---

## 📊 Archivos Modificados

### Backend
- `server/src/controllers/superAdminController.js` - +200 líneas
- `server/src/routes/superAdminRoutes.js` - +4 rutas
- `server/src/controllers/adminController.js` - getUsersHierarchy() modificado

### Base de Datos
- `user_cards` - ENUM room actualizado
- `daily_stock_cards` - ENUM room actualizado

### Scripts y Utilidades
- `INICIAR_SERVIDOR.bat` - NUEVO
- `INICIAR_PANEL_ADMIN.bat` - NUEVO
- `INICIAR_TODO.bat` - NUEVO
- `MIGRATION_SALAS_REGALO.sql` - NUEVO
- `test_stock_regalo_simple.ps1` - NUEVO

---

## 🔐 Credenciales SuperAdmin

- **Usuario**: Andy
- **Contraseña**: Tasso2025
- **Role**: superadmin
- **Permisos exclusivos**:
  - Generación de stock de regalo
  - Transferencia de stock de regalo
  - Gestión de precios
  - Estadísticas del sistema

---

## 🚀 Cómo Usar las Nuevas Funcionalidades

### Generar Stock de Regalo (SuperAdmin)
```bash
POST /api/superadmin/stock/generate
{
  "room": "bronce_regalo",
  "quantity": 10,
  "playDate": "2025-12-11",
  "playTime": "19:00:00"
}
```

### Transferir Stock a Admin/Agente
```bash
POST /api/superadmin/stock/transfer
{
  "targetUserId": 2,
  "room": "bronce_regalo",
  "quantity": 5
}
```

### Consultar Stock de Usuario
```bash
GET /api/superadmin/stock/user/2
```

---

## ✅ Estado del Proyecto

- ✅ Sistema de salas de regalo implementado y funcional
- ✅ Jerarquía de usuarios filtrada correctamente
- ✅ Scripts de inicio automático creados
- ✅ Migración de base de datos ejecutada
- ✅ Tests automatizados creados
- ✅ Documentación actualizada

---

## 📝 Notas Técnicas

- Las salas de regalo usan el mismo modelo de `user_cards` (relacional)
- Los cartones se insertan como filas individuales en `user_cards`
- El stock se cuenta con `COUNT(*)` agrupado por `room`
- La auditoría se registra en `gift_movements` con razón diferenciada
- Las validaciones de permisos están a nivel de controlador

---

## 🎯 Próximos Pasos Sugeridos

1. Crear interfaz frontend para gestión de stock de regalo
2. Agregar notificaciones cuando se reciben cartones de regalo
3. Implementar reportes de uso de cartones de regalo
4. Dashboard visual de stock por sala
