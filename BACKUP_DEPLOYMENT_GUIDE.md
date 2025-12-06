# 🎰 24 KILATES BINGO - BACKUP & DEPLOYMENT GUIDE

## 📦 Repositorio Git Creado

✅ **Estado:** Repositorio local inicializado  
📁 **Ubicación:** `C:\Users\User\Documents\24 kilates`  
🔖 **Commit:** `827e378` - Initial commit v1.3.0  
📊 **Archivos:** 125 archivos, 34,135 líneas

---

## 🚀 Opciones de Respaldo

### Opción 1: GitHub (Recomendado)

**Pasos:**

1. **Crear repositorio en GitHub:**
   - Ve a: https://github.com/new
   - Nombre: `24-kilates-bingo`
   - Visibilidad: **Private** (por seguridad)
   - NO inicializar con README (ya tienes archivos)

2. **Conectar y subir:**
   ```bash
   cd "c:\Users\User\Documents\24 kilates"
   
   # Agregar remote
   git remote add origin https://github.com/TU_USUARIO/24-kilates-bingo.git
   
   # Subir código
   git push -u origin master
   ```

3. **Verificar:**
   - Ir a GitHub y verificar que todos los archivos estén subidos
   - Confirmar que `.env` NO se subió (está en .gitignore)

**Ventajas:**
- ✅ Respaldo en la nube automático
- ✅ Control de versiones completo
- ✅ Colaboración en equipo
- ✅ GitHub Actions para CI/CD
- ✅ Issues y project management

---

### Opción 2: GitLab (Alternativa privada)

**Similar a GitHub pero con más features gratis:**

```bash
cd "c:\Users\User\Documents\24 kilates"

# Crear proyecto en GitLab primero
git remote add origin https://gitlab.com/TU_USUARIO/24-kilates-bingo.git
git push -u origin master
```

**Ventajas:**
- ✅ CI/CD integrado gratis
- ✅ Container registry incluido
- ✅ Más espacio para repos privados

---

### Opción 3: Bitbucket (Para equipos pequeños)

```bash
cd "c:\Users\User\Documents\24 kilates"

git remote add origin https://bitbucket.org/TU_USUARIO/24-kilates-bingo.git
git push -u origin master
```

---

### Opción 4: Servidor Propio (Git Server)

**Para máxima privacidad:**

1. **En tu servidor (Linux):**
   ```bash
   # Instalar Git
   sudo apt install git
   
   # Crear repositorio bare
   mkdir -p /var/git/24-kilates-bingo.git
   cd /var/git/24-kilates-bingo.git
   git init --bare
   ```

2. **En tu máquina local:**
   ```bash
   cd "c:\Users\User\Documents\24 kilates"
   
   git remote add origin usuario@tu-servidor.com:/var/git/24-kilates-bingo.git
   git push -u origin master
   ```

---

## 📂 Respaldo Local Adicional

### Opción A: Copia Comprimida

```powershell
# Crear backup con fecha
$fecha = Get-Date -Format "yyyy-MM-dd"
$origen = "c:\Users\User\Documents\24 kilates"
$destino = "c:\Backups\24-kilates-$fecha.zip"

# Comprimir (excluyendo node_modules)
Compress-Archive -Path $origen -DestinationPath $destino -Force

Write-Host "✅ Backup creado: $destino"
```

### Opción B: Sincronización Automática

**Usar Robocopy (Windows):**

```batch
@echo off
REM backup_24kilates.bat

set ORIGEN=c:\Users\User\Documents\24 kilates
set DESTINO=D:\Backups\24-kilates
set FECHA=%date:~-4,4%%date:~-10,2%%date:~-7,2%

robocopy "%ORIGEN%" "%DESTINO%\%FECHA%" /MIR /XD node_modules .git /XF *.log /R:3 /W:5

echo Backup completado: %DESTINO%\%FECHA%
pause
```

**Programar tarea diaria:**
```powershell
# Crear tarea programada (ejecutar como Admin)
$action = New-ScheduledTaskAction -Execute "c:\Users\User\Documents\backup_24kilates.bat"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Backup 24 Kilates" -Description "Backup diario del proyecto"
```

---

## 🌐 Despliegue en Servidor

### Opción 1: VPS con Git (Recomendado)

**1. Configurar servidor:**
```bash
# Conectar por SSH
ssh root@tu-servidor.com

# Instalar dependencias
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx git

# Clonar repositorio
cd /var/www
git clone https://github.com/TU_USUARIO/24-kilates-bingo.git
cd 24-kilates-bingo/server

# Instalar dependencias
npm install --production

# Configurar .env
nano .env
# (Copiar configuración de producción)
```

**2. Configurar MySQL:**
```bash
sudo mysql -u root -p

CREATE DATABASE bingo_24k;
CREATE USER 'bingo_user'@'localhost' IDENTIFIED BY 'password_seguro';
GRANT ALL PRIVILEGES ON bingo_24k.* TO 'bingo_user'@'localhost';
FLUSH PRIVILEGES;

# Importar schema
mysql -u bingo_user -p bingo_24k < /var/www/24-kilates-bingo/server/schema.sql
```

**3. Configurar PM2 (Process Manager):**
```bash
sudo npm install -g pm2

# Iniciar aplicación
cd /var/www/24-kilates-bingo/server
pm2 start src/index.js --name "bingo-24k"

# Configurar autostart
pm2 startup
pm2 save
```

**4. Configurar Nginx:**
```nginx
# /etc/nginx/sites-available/24kilates

server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/24kilates /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Configurar SSL (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

### Opción 2: Docker (Portabilidad)

**1. Crear Dockerfile:**
```dockerfile
# server/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]
```

**2. Crear docker-compose.yml:**
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: bingo_24k
      MYSQL_USER: bingo_user
      MYSQL_PASSWORD: bingo_pass
    volumes:
      - mysql_data:/var/lib/mysql
      - ./server/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "3306:3306"

  backend:
    build: ./server
    depends_on:
      - mysql
    environment:
      DB_HOST: mysql
      DB_USER: bingo_user
      DB_PASSWORD: bingo_pass
      DB_NAME: bingo_24k
      JWT_SECRET: tu_secret_super_seguro
    ports:
      - "3001:3001"
    volumes:
      - ./server:/app
      - /app/node_modules

volumes:
  mysql_data:
```

**3. Desplegar:**
```bash
# Build y levantar
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Parar
docker-compose down
```

---

## 🔄 Workflow de Desarrollo

### Comandos Git Esenciales

```bash
# Ver estado
git status

# Ver cambios
git diff

# Agregar archivos modificados
git add .

# Commit con mensaje
git commit -m "🐛 Fix: Corrección en victoryChecker"

# Subir a GitHub
git push origin master

# Crear rama nueva
git checkout -b feature/nuevo-modulo

# Mergear rama
git checkout master
git merge feature/nuevo-modulo

# Ver historial
git log --oneline --graph --all

# Deshacer cambios
git checkout -- archivo.js

# Volver a commit anterior
git reset --hard HEAD~1
```

---

## 📋 Checklist de Seguridad

Antes de subir a GitHub/GitLab:

- [x] ✅ `.gitignore` configurado
- [ ] ⚠️ Verificar que `.env` NO se suba
- [ ] ⚠️ Cambiar secretos en producción (JWT_SECRET, DB_PASSWORD)
- [ ] ⚠️ Configurar repo como **Private**
- [ ] ⚠️ No incluir datos sensibles en commits
- [ ] ⚠️ Revisar que no haya API keys hardcoded
- [ ] ⚠️ Agregar README con instrucciones de instalación

---

## 🎯 Próximos Pasos Recomendados

1. **Subir a GitHub** (5 minutos)
   ```bash
   git remote add origin https://github.com/TU_USUARIO/24-kilates-bingo.git
   git push -u origin master
   ```

2. **Configurar CI/CD** (opcional)
   - GitHub Actions para tests automáticos
   - Deploy automático en cada push

3. **Documentar instalación**
   - Actualizar README.md con instrucciones
   - Agregar INSTALLATION.md detallado

4. **Implementar backup automático**
   - Script de backup diario
   - Sincronización con S3/Cloud Storage

---

## 📞 Soporte

Si necesitas ayuda:

1. **Subir a GitHub:** Crea cuenta y repositorio privado
2. **Configurar servidor:** Consulta con tu proveedor de hosting
3. **Docker:** Instala Docker Desktop para Windows
4. **Backup automático:** Configura tarea programada de Windows

---

**✅ REPOSITORIO LOCAL CREADO EXITOSAMENTE**

Tu código está ahora versionado y protegido. El siguiente paso es subirlo a GitHub para respaldo en la nube.

**Comando rápido:**
```bash
# 1. Crear repo en GitHub (private)
# 2. Ejecutar:
git remote add origin https://github.com/TU_USUARIO/24-kilates-bingo.git
git push -u origin master
```

🎉 **¡Respaldo completado!**
