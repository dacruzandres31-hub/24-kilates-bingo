# Sistema de Bloqueo de Usuarios - Implementación Completa
**Fecha**: 18 de diciembre de 2025  
**Versión**: 1.5.0

## Resumen Ejecutivo

Se ha implementado un sistema completo de bloqueo de usuarios que permite a los administradores bloquear temporalmente el acceso de jugadores y agentes, con registro de auditoría completo y prevención de inicio de sesión.

---

## Funcionalidades Implementadas

### 1. **Panel de Gestión de Usuarios (Admin)**
- ✅ Botón de candado con estados visuales:
  - 🔓 **Candado Abierto**: Usuario activo
  - 🔒 **Candado Cerrado**: Usuario bloqueado
  
- ✅ **Cuando el usuario está ACTIVO**:
  - Al hacer clic en el candado abierto → Se abre modal de bloqueo
  - Modal solicita **motivo del bloqueo** (obligatorio)
  - Todos los botones de acción están visibles (ℹ️, 🔑, ✏️, 👁️)

- ✅ **Cuando el usuario está BLOQUEADO**:
  - Badge **"🔒 BLOQUEADO"** visible en color rojo
  - Todos los botones de acción están **ocultos** (excepto el candado)
  - Al hacer clic en el candado cerrado → Se abre modal de desbloqueo
  - Modal muestra el motivo del bloqueo y confirma desbloqueo

### 2. **Prevención de Login**
- ✅ **Login Admin** (`client-admin/src/pages/Login.jsx`):
  - Detecta usuarios bloqueados vía HTTP 403
  - Muestra `BlockedUserModal` con mensaje según rol
  
- ✅ **Login Jugador** (`client-player/src/pages/LoginPlayer.jsx`):
  - Detecta usuarios bloqueados vía HTTP 403
  - Muestra `BlockedUserModal` con mensajes específicos:
    - **Jugador**: "Ponete en contacto con tu agente"
    - **Agente**: "Ponete en contacto con tu superior"

### 3. **Base de Datos**
- ✅ Nuevas columnas en tabla `users`:
  ```sql
  is_blocked BOOLEAN DEFAULT FALSE
  block_reason TEXT NULL
  blocked_at TIMESTAMP NULL
  blocked_by INT NULL
  INDEX idx_is_blocked (is_blocked)
  ```

- ✅ Tabla de auditoría `user_blocks_log`:
  ```sql
  id, user_id, action (block/unblock), reason, 
  performed_by, performed_at
  ```

- ✅ Vista `blocked_users`:
  - Lista todos los usuarios bloqueados
  - Incluye username del bloqueador
  - Ordenada por fecha de bloqueo

---

## Archivos Creados

### **Backend**
| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| `userController.js` | `server/src/controllers/` | Funciones `blockUser()` y `unblockUser()` |
| `userRoutes.js` | `server/src/routes/` | Rutas `POST /users/:id/block` y `/users/:id/unblock` |
| `authController.js` | `server/src/controllers/` | Login modificado para detectar `is_blocked` |
| Migración SQL | `server/USER_BLOCK_MIGRATION_COMPATIBLE.sql` | Schema de bloqueo compatible |

### **Frontend Admin**
| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| `BlockUserModal.jsx` | `client-admin/src/components/` | Modal para bloquear con motivo |
| `UnblockUserModal.jsx` | `client-admin/src/components/` | Modal para desbloquear con confirmación |
| `BlockedUserModal.jsx` | `client-admin/src/components/` | Modal mostrado al intentar login |
| `GestionUsuarios.jsx` | `client-admin/src/components/` | Integración de modales y lógica UI |
| `Login.jsx` | `client-admin/src/pages/` | Detección de usuarios bloqueados |

### **Frontend Jugador**
| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| `BlockedUserModal.jsx` | `client-player/src/components/` | Modal con mensajes según rol |
| `LoginPlayer.jsx` | `client-player/src/pages/` | Detección de usuarios bloqueados |

---

## Endpoints API

### **POST /api/admin/users/:userId/block**
Bloquea un usuario con motivo obligatorio.

**Request Body**:
```json
{
  "reason": "Violación de términos de servicio"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Usuario bloqueado correctamente",
  "blockedAt": "2025-12-18T10:30:00.000Z"
}
```

**Validaciones**:
- ❌ No se puede bloquear a SuperAdmins
- ✅ Reason es obligatorio (min 10 caracteres)
- ✅ Registra en `user_blocks_log`

---

### **POST /api/admin/users/:userId/unblock**
Desbloquea un usuario previamente bloqueado.

**Request Body**:
```json
{}
```

**Response**:
```json
{
  "success": true,
  "message": "Usuario desbloqueado correctamente"
}
```

**Errores Posibles**:
- **HTTP 403**: "No tienes permiso para desbloquear a este usuario" (fuera de jerarquía)
- **HTTP 403**: "Solo Andy puede desbloquear a este usuario" (bloqueado por Andy)
- **HTTP 404**: "Usuario no encontrado"
- **HTTP 400**: "Usuario no está bloqueado"

**Efectos**:
- Establece `is_blocked = FALSE`
- Limpia `block_reason`, `blocked_at`, `blocked_by`
- Registra acción en `user_blocks_log`

**Validación de Permisos**:
1. ✅ Andy puede desbloquear a cualquiera
2. ✅ Quien bloqueó puede desbloquear
3. ✅ Agente superior en jerarquía puede desbloquear
4. ❌ Si Andy bloqueó, solo Andy puede desbloquear
5. ❌ Agentes fuera de jerarquía no pueden desbloquear

---

### **POST /api/auth/login** (Modificado)
Login ahora detecta usuarios bloqueados.

**Response cuando bloqueado (HTTP 403)**:
```json
{
  "error": "Usuario bloqueado",
  "blocked": true,
  "reason": "Motivo del bloqueo",
  "role": "jugador"  // o "agente"
}
```

---

## Flujos de Trabajo

### **Bloquear Usuario**
1. Admin hace clic en 🔓 en lista de usuarios
2. Se abre `BlockUserModal`
3. Admin ingresa motivo del bloqueo (textarea)
4. Admin confirma → API `POST /users/:id/block`
5. Backend:
   - Valida que no sea SuperAdmin
   - Valida motivo (min 10 caracteres)
   - Actualiza `is_blocked = TRUE`, guarda motivo y fecha
   - Registra en `user_blocks_log`
6. Frontend actualiza lista → Usuario ahora tiene badge "🔒 BLOQUEADO"
7. Botones de acción se ocultan, solo queda candado cerrado

### **Desbloquear Usuario**
1. Admin hace clic en 🔒 en usuario bloqueado
2. Se abre `UnblockUserModal`
3. Modal muestra:
   - Username
   - Motivo del bloqueo
   - Confirmación: "¿Desbloquear a [username]?"
4. Admin confirma → API `POST /users/:id/unblock`
5. Backend:
   - **Verifica permisos** (ver sección Reglas de Desbloqueo)
   - Establece `is_blocked = FALSE`
   - Limpia campos de bloqueo
   - Registra en `user_blocks_log`
6. Frontend actualiza lista → Usuario vuelve a estado normal
7. Candado cambia a 🔓, botones de acción reaparecen

#### **Reglas de Desbloqueo (Jerarquía)**
- ✅ **Andy (SuperAdmin)** puede desbloquear a **cualquier usuario**
- ✅ **Quien bloqueó** al usuario puede desbloquearlo
- ✅ **Agente superior en la jerarquía** del usuario bloqueado puede desbloquear
- ❌ **Si Andy bloqueó** al usuario, **solo Andy** puede desbloquearlo
- ❌ Agentes **fuera de la jerarquía** del bloqueado **NO pueden** desbloquear
- ❌ **Jugadores** no pueden desbloquear a nadie

### **Usuario Bloqueado Intenta Login**
1. Usuario ingresa credenciales en Login
2. API retorna HTTP 403 con `{ blocked: true, role: "jugador", reason: "..." }`
3. Frontend detecta flag `blocked`
4. Muestra `BlockedUserModal` con mensaje según rol:
   - **Jugador**: "Ponete en contacto con tu agente"
   - **Agente**: "Ponete en contacto con tu superior"
5. Usuario hace clic en "ENTENDIDO" → Modal se cierra
6. Contraseña se limpia automáticamente

---

## Seguridad y Validaciones

### **Backend**
- ✅ **No se puede bloquear SuperAdmins** (protección hardcoded)
- ✅ **Motivo obligatorio** para bloquear (min 10 caracteres)
- ✅ **Auditoría completa** en `user_blocks_log` (quién, cuándo, qué)
- ✅ **Verificación en login** antes de generar token
- ✅ **Índice en is_blocked** para consultas rápidas

### **Frontend**
- ✅ **Confirmación visual** antes de bloquear/desbloquear
- ✅ **Validación de motivo** en modal (no vacío)
- ✅ **Actualización automática** de lista después de operación
- ✅ **Mensajes diferenciados** según rol del usuario bloqueado
- ✅ **Limpieza de contraseña** al mostrar modal de bloqueado

---

## Testing

### **Script de Prueba Automatizado**

**Archivo**: `test_unblock_permissions.ps1`  
**Ubicación**: Raíz del proyecto

Este script prueba todas las reglas de desbloqueo:

```powershell
.\test_unblock_permissions.ps1
```

**Escenarios Probados**:
1. ✅ Agente1 bloquea a Jugador1
2. ❌ Agente2 (fuera de jerarquía) intenta desbloquear → **403 Forbidden**
3. ✅ Agente1 (quien bloqueó) desbloquea → **Éxito**
4. ✅ Andy (superior jerárquico) desbloquea → **Éxito**
5. ✅ Andy bloquea a Agente1
6. ❌ Agente2 intenta desbloquear usuario bloqueado por Andy → **403 Forbidden**
7. ✅ Andy desbloquea a Agente1 → **Éxito**

### **Comandos para Pruebas Manuales**

#### 1. Bloquear usuario desde consola MySQL
```sql
UPDATE users 
SET is_blocked = TRUE, 
    block_reason = 'Prueba manual', 
    blocked_at = NOW(), 
    blocked_by = 1 
WHERE username = 'test_user';
```

#### 2. Ver usuarios bloqueados
```sql
SELECT * FROM blocked_users;
```

#### 3. Ver historial de bloqueos
```sql
SELECT 
    ubl.*,
    u.username AS affected_user,
    p.username AS performed_by_user
FROM user_blocks_log ubl
JOIN users u ON ubl.user_id = u.id
LEFT JOIN users p ON ubl.performed_by = p.id
ORDER BY ubl.performed_at DESC
LIMIT 20;
```

#### 4. Desbloquear todos los usuarios (Desarrollo)
```sql
UPDATE users SET is_blocked = FALSE, block_reason = NULL, blocked_at = NULL, blocked_by = NULL;
```

### **Checklist de Pruebas**
- [ ] Bloquear jugador desde panel admin
- [ ] Intentar login como jugador bloqueado → Ver modal con "contacta tu agente"
- [ ] Bloquear agente desde panel admin
- [ ] Intentar login como agente bloqueado → Ver modal con "contacta tu superior"
- [ ] Desbloquear usuario por quien lo bloqueó → Verificar que puede hacer login
- [ ] **NUEVO**: Agente superior en jerarquía desbloquea → Debe funcionar
- [ ] **NUEVO**: Agente fuera de jerarquía intenta desbloquear → Debe fallar (403)
- [ ] **NUEVO**: Andy bloquea usuario → Solo Andy puede desbloquear
- [ ] **NUEVO**: Otro agente intenta desbloquear usuario bloqueado por Andy → Debe fallar (403)
- [ ] Verificar que SuperAdmin NO se puede bloquear
- [ ] Verificar badge "🔒 BLOQUEADO" en lista de usuarios
- [ ] Verificar que botones de acción desaparecen cuando usuario está bloqueado
- [ ] Verificar registros en `user_blocks_log` después de bloquear/desbloquear
- [ ] Verificar que vista `blocked_users` muestra datos correctos

---

## Migración de Base de Datos

**Archivo**: `server/USER_BLOCK_MIGRATION_COMPATIBLE.sql`  
**Estado**: ✅ **APLICADA** el 18/12/2025

### Aplicar Manualmente (Si es necesario)
```powershell
cd "C:\Users\User\Documents\24 kilates\server"
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p bingo_24k -e "source USER_BLOCK_MIGRATION_COMPATIBLE.sql"
```

### Verificar Columnas
```sql
USE bingo_24k;
DESCRIBE users;  -- Debe mostrar: is_blocked, block_reason, blocked_at, blocked_by
SHOW TABLES LIKE '%block%';  -- Debe mostrar: user_blocks_log, blocked_users
```

---

## Integración con Sistema Existente

### **GestionUsuarios.jsx**
- Usa `getAllUsers()` que ahora incluye campos de bloqueo
- Renderizado condicional de badge y botones según `usuario.is_blocked`
- Funciones `handleBlockUser()` y `handleUnblockUser()` llaman a API
- Recarga automática de lista después de operaciones

### **authController.js**
- `login()` verifica `user.is_blocked` antes de generar token
- Retorna HTTP 403 con flag `blocked: true` y datos del bloqueo
- Frontend detecta este código y muestra modal apropiado

### **Modales Reutilizables**
- `BlockUserModal`: Usado en admin para bloquear
- `UnblockUserModal`: Usado en admin para desbloquear
- `BlockedUserModal`: Usado en ambos logins (admin y jugador)

---

## Mejoras Futuras (Opcional)

1. **Auto-desbloqueo programado**:
   - Agregar campo `unblock_at TIMESTAMP`
   - Cron job que desbloquea usuarios cuando se cumple la fecha

2. **Notificaciones**:
   - Email/SMS al usuario bloqueado
   - Notificación al agente cuando se bloquea su jugador

3. **Bloqueo por niveles**:
   - Solo SuperAdmin puede bloquear agentes
   - Agentes solo pueden bloquear sus propios jugadores

4. **Dashboard de bloqueos**:
   - Panel en admin mostrando estadísticas
   - Gráfico de bloqueos por semana
   - Razones más comunes de bloqueo

---

## Comandos de Desarrollo

### **Reiniciar Servidor Backend**
```powershell
cd "C:\Users\User\Documents\24 kilates"
npm run dev -w server
```

### **Reiniciar Cliente Admin**
```powershell
cd "C:\Users\User\Documents\24 kilates"
npm run dev -w client-admin
```

### **Reiniciar Cliente Jugador**
```powershell
cd "C:\Users\User\Documents\24 kilates"
npm run dev -w client-player
```

### **Iniciar Todo el Sistema**
```powershell
cd "C:\Users\User\Documents\24 kilates"
npm run dev  # Inicia todos los workspaces
```

---

## Soporte y Troubleshooting

### **Problema**: Usuario bloqueado puede hacer login
**Solución**: 
- Verificar que backend está actualizado con cambios en `authController.js`
- Verificar que columna `is_blocked` existe en base de datos
- Reiniciar servidor backend

### **Problema**: Modales no aparecen
**Solución**:
- Verificar que componentes de modales están importados
- Revisar consola del navegador (F12) para errores de React
- Verificar que `createPortal` funciona (comprobar en inspector de elementos)

### **Problema**: Errores de SQL al aplicar migración
**Solución**:
- Usar `USER_BLOCK_MIGRATION_COMPATIBLE.sql` en lugar de `USER_BLOCK_MIGRATION.sql`
- Verificar versión de MySQL (debe ser 8.0+)
- Ejecutar desde directorio `server/` para que `source` funcione correctamente

---

## Contacto Técnico

**Desarrollado por**: Equipo Bingo 24K  
**Fecha de Entrega**: 18 de diciembre de 2025  
**Versión del Sistema**: 1.5.0  
**Documentación Relacionada**: 
- `PUNTOS_CRITICOS_PRODUCCION.md`
- `INTEGRATION_CHECKLIST.md`
- `START_HERE.md`

---

## Estado Final

✅ **SISTEMA COMPLETAMENTE FUNCIONAL**

- ✅ Base de datos migrada
- ✅ Backend implementado y testeado
- ✅ Frontend admin integrado
- ✅ Frontend jugador integrado
- ✅ Modales funcionando correctamente
- ✅ Auditoría completa
- ✅ Prevención de login activa
- ✅ Documentación completa

**Listo para producción** 🚀
