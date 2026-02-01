# 🚀 Deployment Guide - Bingo 24 Kilates (Cloud VPS / Vultr / Digital Ocean)

## Producción en VPS Cloud (Ubuntu 22.04)

Este documento describe cómo desplegar Bingo 24 Kilates en cualquier proveedor de VPS (Vultr, Digital Ocean, Linode, AWS) como una PWA de alto rendimiento usando Docker.

---

## 📋 Pre-requisitos

### En tu máquina local

- Node.js 18+
- npm o yarn
- Git
- Docker (opcional, para testing local)

### En Digital Ocean

- Droplet Ubuntu 22.04 LTS
- Mínimo: 4 vCPUs, 8GB RAM, 160GB SSD
- Dominio configurado apuntando al droplet

---

## 🏗️ Arquitectura

```plaintext
Internet
    ↓
Nginx (Reverse Proxy + SSL)
    ↓
├── Static Files (PWA) → /var/www/bingo24k/client-player/dist
├── Admin Panel → /var/www/bingo24k/client-admin/dist
├── API → Backend (PM2 Cluster)
└── WebSocket → Backend (Socket.IO + Redis Adapter)
    ↓
├── MySQL (Database)
└── Redis (Cache + Sessions)
```

---

## 📦 Archivos de Configuración

### 1. PM2 Ecosystem (`server/ecosystem.config.js`)

- Cluster mode (usa todos los CPUs)
- Auto-restart en crash
- Límite de memoria: 1GB
- Logs en `server/logs/`

### 2. Nginx (`nginx.conf`)

- SSL/TLS con Let's Encrypt
- HTTP/2 enabled
- Gzip compression
- WebSocket proxy
- Static file caching (1 año)
- Service Worker sin cache

### 3. Docker Compose (`docker-compose.prod.yml`)

- Nginx
- Backend (Node.js + PM2)
- MySQL 8.0
- Redis Alpine
- Certbot (SSL auto-renewal)

### 4. Dockerfile (`server/Dockerfile.prod`)

- Node 18 Alpine (imagen ligera)
- PM2 runtime
- Health checks
- Production dependencies only

---

## 🚀 Deployment Rápido

### Opción 1: Script Automático

```bash
# 1. Clonar repositorio en el servidor
git clone https://github.com/tu-usuario/24-kilates.git
cd 24-kilates

# 2. Configurar variables de entorno
cp .env.production.template .env
nano .env  # Editar con tus valores

# 3. Ejecutar deployment
chmod +x deploy.sh
./deploy.sh
```

### Opción 2: Manual

```bash
# 1. Build Frontend Player
cd client-player
npm install
npm run build

# 2. Build Frontend Admin
cd ../client-admin
npm install
npm run build

# 3. Install Backend
cd ../server
npm install --production

# 4. Start con Docker
cd ..
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🔐 Configurar SSL (Let's Encrypt)

```bash
# 1. Instalar Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 2. Obtener certificado
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# 3. Auto-renewal (ya configurado en docker-compose)
sudo certbot renew --dry-run
```

---

## 📊 Monitoreo

### Ver logs en tiempo real

```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Solo backend
docker-compose -f docker-compose.prod.yml logs -f backend

# PM2 dentro del container
docker exec bingo24k-backend-prod pm2 logs
```

### Estado de servicios

```bash
# Docker
docker-compose -f docker-compose.prod.yml ps

# PM2
docker exec bingo24k-backend-prod pm2 status

# Nginx
sudo systemctl status nginx
```

### Métricas PM2 Plus (Opcional)

```bash
# Conectar a PM2 Plus para monitoring avanzado
docker exec bingo24k-backend-prod pm2 link <secret> <public>
```

---

## 🔧 Optimizaciones Aplicadas

### PWA

- ✅ Service Worker con caching agresivo
- ✅ Manifest configurado
- ✅ Iconos 192x192 y 512x512
- ✅ Offline-first para assets estáticos

### Build

- ✅ Code splitting por vendor y componentes
- ✅ Terser minification (drop console.log)
- ✅ CSS code splitting
- ✅ No sourcemaps en producción
- ✅ Chunk naming optimizado

### Backend

- ✅ PM2 cluster mode (multi-core)
- ✅ Redis adapter para Socket.IO
- ✅ Connection pooling MySQL (20 conexiones)
- ✅ Graceful shutdown
- ✅ Health checks

### Nginx

- ✅ Gzip compression
- ✅ HTTP/2
- ✅ Static file caching (1 año)
- ✅ WebSocket proxy
- ✅ Security headers

---

## 📈 Escalabilidad

### Para 500-5000 usuarios

```yaml
# Configuración actual (docker-compose.prod.yml)
- 1x Nginx
- 1x Backend (PM2 cluster con N CPUs)
- 1x MySQL
- 1x Redis
```

### Para 5000+ usuarios

1. **Load Balancer**: Digital Ocean Load Balancer
2. **App Servers**: 2-4 droplets con backend
3. **Database**: Managed MySQL (Digital Ocean)
4. **Redis**: Managed Redis
5. **CDN**: Cloudflare o DigitalOcean Spaces

---

## 🐛 Troubleshooting

### Backend no inicia

```bash
# Ver logs
docker logs bingo24k-backend-prod

# Verificar variables de entorno
docker exec bingo24k-backend-prod env

# Reiniciar
docker-compose -f docker-compose.prod.yml restart backend
```

### MySQL connection error

```bash
# Verificar que MySQL esté corriendo
docker-compose -f docker-compose.prod.yml ps mysql

# Verificar conexión
docker exec bingo24k-mysql-prod mysql -u root -p -e "SHOW DATABASES;"
```

### WebSocket no conecta

```bash
# Verificar Nginx config
sudo nginx -t

# Ver logs de Nginx
docker logs bingo24k-nginx-prod

# Verificar que Socket.IO esté escuchando
docker exec bingo24k-backend-prod netstat -tulpn | grep 3001
```

---

## 🔄 Actualizar Aplicación

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild
./deploy.sh

# O manualmente:
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 💰 Costos Estimados (Digital Ocean)

### Setup Recomendado (~$150/mes)

- Load Balancer: $12/mes
- 2x App Servers (4GB): $48/mes
- Database (8GB): $48/mes
- Redis (2GB): $18/mes
- Backups: $10/mes
- CDN: $10-20/mes

### Alta Escala (~$300-500/mes)

- Load Balancer: $12/mes
- 4x App Servers: $96/mes
- Managed Database (16GB): $120/mes
- Managed Redis: $40/mes
- CDN: $30/mes
- Monitoring: $20/mes

---

## 📞 Soporte

Para problemas de deployment:

1. Revisar logs: `docker-compose logs -f`
2. Verificar health checks
3. Consultar documentación de Digital Ocean
4. Contactar al equipo de desarrollo

---

## ✅ Checklist de Deployment

- [ ] Dominio configurado y apuntando al servidor
- [ ] Variables de entorno configuradas (.env)
- [ ] Builds de frontend completados
- [ ] Docker containers corriendo
- [ ] SSL configurado (Let's Encrypt)
- [ ] Base de datos migrada
- [ ] Health checks pasando
- [ ] Monitoring configurado
- [ ] Backups automáticos configurados
- [ ] DNS configurado correctamente
- [ ] Pruebas de carga realizadas

---

**¡Listo para producción!** 🎉
