# 🎰 BINGO 24K - Setup y Deploy

Plataforma de bingo online con sistema multinivel, gamificación y automatización completa.

## 📋 Requisitos Previos

- **Node.js**: 18+ LTS
- **PostgreSQL**: 12+
- **npm**: 9+ o yarn
- **Git**: para versionado

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
# Conectarse a PostgreSQL
psql -U postgres

# Crear database
CREATE DATABASE bingo_24k;

# Salir
\q

# Ejecutar schema
psql -U postgres -d bingo_24k -f server/schema.sql
```

### 4. Configurar Variables de Entorno

```bash
# En server/.env
cp server/.env.example server/.env
```

Edita `server/.env`:

```env
# Database
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/bingo_24k

# Server
PORT=3000
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
│   │   ├── db.js                    (Pool PostgreSQL)
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
│   │   │   └── stockManager.js      (Inventory)
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

### Retiros (20-min Rule)
- Bloqueo de retiros durante 20 minutos después del depósito
- Excepciones: SuperAdmin, Cajero Oficial
- Validación en middleware

### Auditoría
- Money trail: `agent_path` JSON en cada transacción
- Timestamps en todas las operaciones
- Tabla `audit_revenue` para compliance

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

## 📊 Distribución de Dinero

Precio cartón: $50 (ej.)

- **50%** → BINGO pot ($25)
- **15%** → LÍNEA pot ($7.50)
- **5%** → JACKPOT pot ($2.50)
- **30%** → Casa ($15)

La casa cubre: servidores, staff, mantenimiento, costo de retiros.

## 🗄️ Base de Datos

### Tablas Principales

1. **users** - Usuarios con jerarquía multinivel
2. **game_sessions** - Partidas activas/completadas
3. **daily_stock_cards** - 10k cartones por sala/día
4. **prize_claims** - Premios a cobrar
5. **audit_revenue** - Money trail completo

### Indexes Optimizados

```sql
CREATE INDEX idx_available_cards ON daily_stock_cards(room, play_date, status);
CREATE INDEX idx_daily_stock_date ON daily_stock_cards(play_date);
CREATE INDEX idx_daily_stock_buyer ON daily_stock_cards(buyer_id, play_date);
```

## 🚢 Deployment (Production)

### Pre-requisitos
- SSL certificate (Let's Encrypt)
- Nginx con proxy inverso
- PM2 para process management
- PostgreSQL backup automático

### Subdomios Recomendados
- `api.24kilates.com` → Server (3000)
- `jugar.24kilates.com` → Player PWA (5173)
- `panel.24kilates.com` → Admin (5174)

### Nginx Config (Ej.)
```nginx
upstream api {
  server localhost:3000;
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

### Finance
- `GET /api/finance/balance` - Mi balance
- `POST /api/finance/withdrawal` - Solicitar retiro
- `GET /api/finance/transactions` - Historial

### Users (Admin)
- `POST /api/users` - Crear usuario
- `GET /api/users/:id` - Usuario específico
- `GET /api/users/:id/network` - Red multinivel

## 🆘 Troubleshooting

### Puerto 3000 en uso
```bash
lsof -i :3000
kill -9 <PID>
```

### PostgreSQL no conecta
```bash
# Verificar servicio
sudo service postgresql status

# Reiniciar
sudo service postgresql restart
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

**Versión:** 1.0.0  
**Última actualización:** 2024  
**Estado:** Ready for MVP Launch 🚀
