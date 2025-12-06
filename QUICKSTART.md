# 🚀 QUICK START - Bingo 24K

Guía rápida para tener el sistema funcionando en 5 minutos.

## Paso 0: IMPORTANTE - Nuevo Sistema de Tickets (Lee primero)

**NUEVO en v1.3.0:** Sistema de Tickets y Premios Híbridos

- ✅ Los usuarios pueden ganar **Tickets canjeables** por cartones gratis
- ✅ Los premios pueden ser **Consumibles (Tickets)** o **Equipables (Skins)**
- ✅ Sala Bronce permite pagar con **Dinero O Tickets**

📚 **Lee esto primero:** `TICKETS_PREMIOS_HIBRIDOS.md` y `TICKETS_INTEGRACION_GUIA.md`

## Paso 1: Setup Base de Datos (2 min)

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Crear database
CREATE DATABASE bingo_24k;

# Salir (\q) y ejecutar schema
\q
psql -U postgres -d bingo_24k -f "C:\Users\User\Documents\24 kilates\server\schema.sql"

# ⭐ IMPORTANTE: Ejecutar migration de Tickets
psql -U postgres -d bingo_24k -f "C:\Users\User\Documents\24 kilates\server\TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql"
```

✅ **Database lista con soporte para Tickets**

## Paso 2: Configurar Variables de Entorno (1 min)

Archivo: `server/.env`

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/bingo_24k
PORT=3000
NODE_ENV=development
JWT_SECRET=tu_secreto_super_seguro_24k_2024
CORS_ORIGIN_PLAYER=http://localhost:5173
CORS_ORIGIN_ADMIN=http://localhost:5174
```

✅ **Env configurado**

## Paso 3: Instalar Dependencias (1 min)

```bash
cd "C:\Users\User\Documents\24 kilates"
npm install
```

✅ **Dependencias instaladas**

## Paso 4: Iniciar Sistema (1 min)

```bash
# Desde raíz del proyecto
npm run dev
```

Espera a ver:

```
╔════════════════════════════════════════╗
║   🎰 BINGO 24K - SERVIDOR INICIADO    ║
╚════════════════════════════════════════╝

📍 Ambiente: development
🚀 Puerto: 3000
🔗 URL: http://localhost:3000
📊 Health: http://localhost:3000/health
🔌 Socket.IO: Conectado
⏰ Scheduler: 3 jobs activos
```

## Acceso a los Sistemas

### 🎮 Jugador (Player)
```
http://localhost:5173
```
- Login: Crear cuenta primero
- Jugar bingo
- Comprar cartones
- Ver premios

### 👨‍💼 Panel Admin
```
http://localhost:5174
```
- Usuario: admin
- Pass: admin123
- Gestionar usuarios
- Ver ventas
- Procesar retiros

### 🔌 API Server
```
http://localhost:3000/health
```
- Verificar estado
- Socket.IO conectado
- Scheduler activo

## ✅ Verificación Rápida

### 1. Health Check
```bash
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "scheduler": {
    "running": true,
    "activeJobs": 3
  }
}
```

### 2. Crear Usuario (Test)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123",
    "role": "jugador"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123"
  }'
```

Copiar el `token` retornado.

### 4. Ver Balance
```bash
curl http://localhost:3000/api/finance/balance \
  -H "Authorization: Bearer TOKEN_AQUI"
```

## 🎯 Flujo de Prueba

1. **Crear SuperAdmin**
```bash
# En PostgreSQL:
INSERT INTO users (username, password_hash, role, balance)
VALUES ('admin', '$2a$10$...hash...', 'superadmin', 10000);
```

2. **Crear Agente** (vía admin panel)
   - Login: admin/admin123
   - Panel → Players → New User
   - Role: Agente
   - Balance: 1000

3. **Crear Jugador** (vía admin panel)
   - Role: Jugador
   - Balance: 100

4. **Jugar**
   - Login como jugador
   - Comprar cartón ($50)
   - Ver GameRoom
   - Esperar a que se sortee

## 📊 Datos de Prueba

### Usuarios Pre-creados
```
Usuario: admin
Contraseña: admin123
Rol: SuperAdmin
Balance: 10000

Usuario: agente1
Contraseña: agente123
Rol: Agente
Balance: 5000
Parent: admin

Usuario: jugador1
Contraseña: jugador123
Rol: Jugador
Balance: 500
Parent: agente1
```

(Crear en PostgreSQL manualmente si es necesario)

## 🔧 Troubleshooting Rápido

### Error: "PostgreSQL no conecta"
```bash
# Verificar que está corriendo
psql -U postgres -c "SELECT version();"
```

### Error: "Puerto 3000 en uso"
```bash
# Windows - Matar proceso
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Error: "Module not found"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Reiniciar Todo
```bash
# Kill all node processes
taskkill /F /IM node.exe

# Clear caches
rm -rf node_modules
npm install

# Start fresh
npm run dev
```

## 📱 Testing en Mobile

Si quieres probar en otro dispositivo:

```bash
# 1. Obtener IP de tu máquina
ipconfig
# Ej: 192.168.1.100

# 2. Editar CORS en server/.env
CORS_ORIGIN_PLAYER=http://192.168.1.100:5173
CORS_ORIGIN_ADMIN=http://192.168.1.100:5174

# 3. Acceder desde celular
http://192.168.1.100:5173
http://192.168.1.100:5174
```

## 🎮 Comandos Útiles

```bash
# Ver logs en tiempo real
npm run dev

# Solo servidor
npm run server

# Solo player PWA
npm run player

# Solo admin panel
npm run admin

# Stop all
Ctrl + C
```

## 📋 Checklist de Inicio

- [ ] PostgreSQL corriendo
- [ ] Database `bingo_24k` creada
- [ ] Schema ejecutado (schema.sql)
- [ ] `.env` configurado en server/
- [ ] `npm install` completado
- [ ] `npm run dev` sin errores
- [ ] Health check OK
- [ ] Puedes crear usuario
- [ ] Puedes loguear
- [ ] Ves balance (Finance API)

## 🆘 Si algo falla

1. **Revisa los logs** - npm run dev muestra todo
2. **Verifica conexión a BD** - `psql -l` lista databases
3. **Limpia caches** - `npm install --legacy-peer-deps`
4. **Reinicia todo** - Mata procesos y vuelve a `npm run dev`
5. **Check puertos** - Verifica que 3000, 5173, 5174 estén libres

## 🎉 ¡Listo!

Sistema completo:
- ✅ Backend + API
- ✅ Socket.IO real-time
- ✅ Player PWA
- ✅ Admin Panel
- ✅ Database con auditoría
- ✅ Scheduler automático
- ✅ Gamificación

**¡A jugar!** 🎰

---

**Nota:** Este es MVP ready. Para producción, agregar SSL, Nginx, backups, monitoring.
