# 🎰 BINGO 24K - Setup y Deploy

Plataforma de bingo online con sistema de fichas interno, gamificación y automatización completa.

## ⚡ ÚLTIMA ACTUALIZACIÓN: WebSocket Real-Time (Dic 2025)

**Sistema de reordenamiento automático de cartones en tiempo real** implementado con WebSocket push-based updates.

### 🚀 Mejoras de Performance
- **-85%** latencia (700ms → 150ms)
- **-100%** HTTP polling (75 requests → 0)
- **-25%** bandwidth (150KB → 112KB)

### 📚 Documentación Técnica
- `WEBSOCKET_REALTIME_IMPLEMENTATION.md` - Arquitectura completa
- `TESTING_GUIDE_WEBSOCKET.md` - Guía de testing paso a paso
- `TESTING_COMPLETE_RESULTS.md` - Resultados de verificación

**Commits**: 3002afd, 7843dff, ac2397d | **Estado**: ✅ Verificado y listo

## 📋 Requisitos Previos

- **Node.js**: 18+ LTS
- **MySQL**: 8.0+
- **npm**: 9+ o yarn
- **Git**: para versionado

## ✨ Features Principales

### 🎮 Sistema de Juego
- ✅ Motor automático de bingo con validación en tiempo real
- ✅ **WebSocket Real-Time**: Reordenamiento automático de cartones sin polling
- ✅ Análisis inteligente de cartones con scoring y alertas
- ✅ Soporte multi-sala (Bronce, Plata, Oro, Platino, Diamante)
- ✅ Sistema de preventa y cierre automático 5 minutos antes

### 💰 Sistema Económico
- ✅ Fichas internas (sistema de monedas virtual)
- ✅ Gestión de retiros en <20 minutos
- ✅ Historial completo de transacciones
- ✅ Sistema de premios híbrido (fichas + efectivo)

### 🎨 Gamificación
- ✅ Niveles de usuario (1-100)
- ✅ Sistema de experiencia y ranking
- ✅ Misiones diarias y logros
- ✅ Ranking semanal con reset automático
- ✅ Notificaciones push en tiempo real

### 🛠️ Administración
- ✅ Panel de control completo
- ✅ Gestión de salas y sesiones
- ✅ Sorteo manual y automático
- ✅ Dashboard con métricas en tiempo real
- ✅ Sistema de programación automática (scheduler)

### ⚡ Performance
- ✅ WebSocket push-based (85% mejora en latencia)
- ✅ Animaciones fluidas y profesionales
- ✅ Optimizado para 20+ cartones simultáneos
- ✅ Auto-reconexión robusta

## 🚀 Instalación Local

### 1. Clonar y Navegar

```bash
git clone <repository-url>
cd "24 kilates"
```

### 2. Instalar Dependencias

```bash
# Instalar dependencias del monorepo
npm install

# Instalar en cada workspace
npm install -w server
npm install -w client-player
npm install -w client-admin
```

### 3. Configurar Base de Datos

```bash
# Conectarse a MySQL
mysql -u root -p

# Crear database
CREATE DATABASE bingo_24k;

# Salir
exit;

# Ejecutar schema
mysql -u root -p bingo_24k < server/schema.sql

# Ejecutar migraciones
mysql -u root -p bingo_24k < server/CHIPS_MOVEMENTS_MIGRATION.sql
mysql -u root -p bingo_24k < server/WITHDRAWAL_REQUESTS_MIGRATION.sql
```

### 4. Configurar Variables de Entorno

```bash
# En server/.env
cp server/.env.example server/.env
```

Edita `server/.env`:

```env
# Database MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=bingo_24k
DB_PORT=3306

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=tu_secreto_super_seguro_24k_2024

# CORS
CORS_ORIGIN_PLAYER=http://localhost:5173
CORS_ORIGIN_ADMIN=http://localhost:5174
```

### 5. Iniciar en Desarrollo

```bash
# Terminal 1 - Desde raíz
npm run dev

# Esto ejecutará:
# - Server en puerto 3000
# - Player PWA en puerto 5173
# - Admin Panel en puerto 5174
```

## 📁 Estructura del Proyecto

```
24 kilates/
├── server/
│   ├── src/
│   │   ├── index.js                 (Entrada principal + Socket.IO)
│   │   ├── db.js                    (Pool MySQL 8.0)
│   │   ├── controllers/             (Lógica de negocio)
│   │   │   ├── authController.js
│   │   │   ├── gameController.js
│   │   │   └── userController.js
│   │   ├── middleware/              (Validaciones)
│   │   │   ├── authMiddleware.js
│   │   │   └── validateWithdrawal.js
│   │   ├── routes/                  (API endpoints)
│   │   ├── services/                (Lógica compleja)
│   │   │   ├── scheduler.js         (Cron jobs)
│   │   │   ├── gameEngine.js        (RNG + winner detection)
│   │   │   ├── cascadeLogic.js      (Jackpot transfers)
│   │   │   ├── dailyGenerator.js    (10k cartones/día)
│   │   │   ├── chipsService.js      (Sistema de fichas interno)
│   │   │   ├── commissionService.js (Comisiones por cajero)
│   │   │   └── stockManager.js      (Inventory)
│   │   ├── utils/                   (Utilidades)
│   │   │   ├── moneyMath.js         (Cálculos precisos decimal.js)
│   │   │   └── victoryChecker.js    (Detector de ganadores optimizado)
│   │   └── models/                  (Database queries)
│   ├── schema.sql                   (Estructura BD)
│   └── package.json
│
├── client-player/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginCard.jsx
│   │   │   ├── BingoCard.jsx
│   │   │   ├── BallDraw.jsx         (Bolillero)
│   │   │   ├── WinnerModal.jsx      (Premio)
│   │   │   └── PrizeOdometer.jsx    (Pots)
│   │   ├── pages/
│   │   │   ├── Lobby.jsx
│   │   │   ├── GameRoom.jsx         (Sala principal)
│   │   │   └── Profile.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useSocket.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── client-admin/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginCard.jsx
│   │   │   ├── UserRow.jsx
│   │   │   └── CreateUserModal.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Players.jsx
│   │   │   └── Withdrawals.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
└── package.json (monorepo)
```

## 🔐 Seguridad

### Autenticación
- JWT con expiration 7 días
- Bcrypt 10+ salt rounds
- Middleware en todas las rutas protegidas
- Roles: player, cajero, admin, superadmin

### Retiros (20-min Rule)
- Bloqueo de retiros durante 20 minutos después del último crédito
- Cajero: puede procesar < 20 minutos
- SuperAdmin: puede procesar siempre
- Requiere CBU (22 dígitos) y nombre del titular

### Sistema de Fichas Interno
- Pagos externos a la plataforma
- Solo fichas/chips dentro del sistema
- Cálculos precisos con MoneyMath (decimal.js)
- Transacciones atómicas (START TRANSACTION / COMMIT / ROLLBACK)

### Auditoría
- Tabla `chips_movements`: historial completo de movimientos
- `balance_before` y `balance_after` en cada operación
- Timestamps automáticos
- Trigger de validación de balances

## ⚙️ Scheduler & Cron Jobs

### Jobs Automáticos (sin intervención manual)

1. **T-5 Closure** (cada minuto verifica)
   - 5 minutos antes de partida
   - Bloquea ventas
   - Limpia cartones viejos (>24h)

2. **Health Check** (cada 6 horas)
   - Verifica integridad del stock
   - Alertas si stock bajo (<1k cartones)
   - Reporte de anomalías

3. **Expired Stock Cleanup** (00:05 hs)
   - Elimina cartones sin vender de ayer
   - Mantiene DB limpia

4. **End-Game Regeneration** (EVENT-DRIVEN)
   - Se dispara cuando termina partida
   - Genera 10k cartones para mañana
   - Integrado en gameController.finishSession()

## 🎮 Flujo de Juego

```
1. Usuario se autentica (JWT token)
2. Entra a Lobby → elige sala (Bronce/Plata/Oro/Free)
3. Ve disponibilidad de cartones
4. Compra cartón (POST /api/game/buy-card)
   - Verifica balance
   - Descuenta dinero
   - Distribuye comisiones (50/15/5/30)
5. Entra a GameRoom
   - Se conecta via Socket.IO
   - Escucha números sorteados
   - Marca cartón automáticamente
6. Juego finaliza → gameEngine detecta ganador
7. Si ganador:
   - Almacena premio en prize_claims
   - Emite evento 'winner_detected'
   - Muestra WinnerModal para reclamar
8. Usuario ingresa CBU/Alias + WhatsApp
   - Se crea withdrawal request
   - Admin procesa en 24-48h
9. Si BINGO después de bolilla 40 → Jackpot cascada a siguiente sesión

```

## 📊 Distribución de Ingresos

**Sistema de Fichas Interno:**
- Pagos se manejan FUERA de la plataforma
- Solo se registran movimientos de fichas internos

**Distribución de Ingresos Netos:**
- **10%** → Casa (ganancia neta del negocio)
- **5%** → Admins (deuda con socios/inversores)
- **15%** → Cajeros (comisión INDIVIDUAL por sus ventas)
- **70%** → Pozos (distribución en línea + bingo + acumulativo)

**Cálculos Precisos:**
- MoneyMath con decimal.js evita errores de punto flotante
- Todas las operaciones en transacciones atómicas
- CommissionService calcula 15% por CADA cajero individualmente

## 🗄️ Base de Datos

### Tablas Principales

1. **users** - Usuarios con roles (player, cajero, admin, superadmin)
2. **game_sessions** - Partidas activas/completadas
3. **daily_stock_cards** - 10k cartones por sala/día (incluye `seller_id`)
4. **chips_movements** - Historial completo de fichas (con balance_before/after)
5. **withdrawal_requests** - Solicitudes de retiro con CBU y regla 20min
6. **bingo_cards** - Cartones vendidos (vinculados a `seller_id` para comisiones)

### Funciones MySQL

```sql
-- Verifica regla de 20 minutos para retiros
CREATE FUNCTION can_process_withdrawal_time_rule(...) RETURNS BOOLEAN;

-- Obtiene minutos desde último crédito
CREATE FUNCTION get_minutes_since_last_credit(...) RETURNS INT;

-- Procesa retiro completo (atómico)
CREATE PROCEDURE process_withdrawal_complete(...);
```

### Indexes Optimizados

```sql
CREATE INDEX idx_available_cards ON daily_stock_cards(room, play_date, status);
CREATE INDEX idx_daily_stock_date ON daily_stock_cards(play_date);
CREATE INDEX idx_daily_stock_buyer ON daily_stock_cards(buyer_id, play_date);
CREATE INDEX idx_chips_movements_user ON chips_movements(user_id, created_at);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status, requested_at);
```

## 🚢 Deployment (Production)

### Pre-requisitos
- SSL certificate (Let's Encrypt)
- Nginx con proxy inverso
- PM2 para process management
- MySQL 8.0 con backup automático (mysqldump)
- Instalar decimal.js: `npm install decimal.js`

### Subdominios Recomendados
- `api.24kilates.com` → Server (3001)
- `jugar.24kilates.com` → Player PWA (5173)
- `panel.24kilates.com` → Admin (5174)

### Nginx Config (Ej.)
```nginx
upstream api {
  server localhost:3001;
}

upstream player {
  server localhost:5173;
}

upstream admin {
  server localhost:5174;
}

server {
  listen 443 ssl http2;
  server_name api.24kilates.com;
  ssl_certificate /etc/letsencrypt/live/24kilates.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/24kilates.com/privkey.pem;

  location / {
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Load testing
npm run test:load
```

## 📝 API Endpoints

### Auth
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar token

### Game
- `POST /api/game/buy-card` - Comprar cartón
- `GET /api/game/my-cards` - Mis cartones
- `POST /api/game/finish-session` - Terminar partida
- `GET /api/game/sessions` - Sesiones activas

### Chips (Sistema de Fichas)
- `POST /api/chips/deposit` - Depositar fichas (admin)
- `GET /api/chips/balance/:userId` - Ver balance de fichas
- `GET /api/chips/movements/:userId` - Historial de movimientos

### Withdrawals (Retiros)
- `POST /api/withdrawals/request` - Solicitar retiro (requiere CBU)
- `POST /api/withdrawals/:id/process` - Procesar retiro (cajero/admin)
- `POST /api/withdrawals/:id/reject` - Rechazar retiro
- `GET /api/withdrawals/pending` - Ver retiros pendientes
- `GET /api/withdrawals/:id/check-permissions` - Verificar permisos 20min

### Admin Dashboard
- `GET /api/admin/dashboard/stats` - Estadísticas consolidadas
- `POST /api/admin/broadcast` - Mensaje global (Socket.IO)
- `GET /api/admin/sessions/stats` - Estadísticas de sesiones
- `GET /api/admin/users/stats` - Estadísticas de usuarios
- `GET /api/admin/revenue/breakdown` - Desglose de ingresos

### Users (Admin)
- `POST /api/users` - Crear usuario
- `GET /api/users/:id` - Usuario específico
- `GET /api/users/:id/network` - Red multinivel

## 🆘 Troubleshooting

### Puerto 3001 en uso
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

### MySQL no conecta
```bash
# Windows
net start MySQL80

# Linux
sudo service mysql status
sudo service mysql restart

# Verificar conexión
mysql -u root -p -e "SELECT VERSION();"
```

### Error de decimales en cálculos
```
Solución: Verificar que MoneyMath se esté usando en lugar de operaciones nativas
Revisar: PUNTOS_CRITICOS_PRODUCCION.md
```

### Socket.IO desconecta
```
- Verificar CORS origins en server
- Checkear firewall
- Ver logs en browser console
```

## 📞 Soporte

Para issues o preguntas, contactar al equipo de desarrollo.

---

## 🎯 Módulos Implementados

- ✅ **MÓDULO 5:** Victory Checker (detector de ganadores optimizado)
- ✅ **MÓDULO 7:** Admin Dashboard API (estadísticas en tiempo real)
- ✅ Sistema de fichas interno con MoneyMath
- ✅ Retiros con regla de 20 minutos y CBU
- ✅ Comisiones individuales por cajero (15%)
- ✅ Transacciones atómicas (ACID compliance)
- ✅ Socket.IO para mensajes globales
- ✅ Gamificación completa

## 📚 Documentación Adicional

- `PUNTOS_CRITICOS_PRODUCCION.md` - 3 puntos clave para producción
- `SISTEMA_RETIROS_20MIN.md` - Documentación completa de retiros
- `MODULO_7_DASHBOARD_API.md` - API del dashboard administrativo
- `ROADMAP_COMERCIALIZACION_v2.md` - Plan de comercialización
- `BACKUP_DEPLOYMENT_GUIDE.md` - Guía de respaldo y deployment

---

**Versión:** 1.3.0  
**Base de Datos:** MySQL 8.0  
**Sistema de Pagos:** Externo (solo fichas internas)  
**Última actualización:** Diciembre 2025  
**Estado:** Production Ready 🚀
