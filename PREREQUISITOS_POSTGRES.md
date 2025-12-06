# 🔴 PREREQUISITOS: Instalación de PostgreSQL

## Estado Actual

❌ **PostgreSQL NO está instalado o no está corriendo**

Para poder ejecutar la migración del sistema de tickets, necesitas tener PostgreSQL instalado y corriendo.

---

## Opción 1: Instalar PostgreSQL en Windows (Recomendado)

### Descargar e Instalar

1. **Descargar PostgreSQL:**
   - Visita: https://www.postgresql.org/download/windows/
   - Descarga el instalador de EnterpriseDB (versión 15 o superior)

2. **Ejecutar instalador:**
   - Sigue el asistente de instalación
   - **IMPORTANTE:** Anota la contraseña que configures para el usuario `postgres`
   - Puerto por defecto: `5432`
   - Instala Stack Builder (incluye herramientas adicionales)

3. **Agregar PostgreSQL al PATH:**
   ```powershell
   # Ejecuta en PowerShell como Administrador
   $env:Path += ";C:\Program Files\PostgreSQL\15\bin"
   [System.Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::Machine)
   ```

4. **Verificar instalación:**
   ```cmd
   psql --version
   ```

### Crear Base de Datos

```cmd
# Conectarse a PostgreSQL
psql -U postgres

# Dentro de psql, ejecutar:
CREATE DATABASE bingo_24k;
\q
```

---

## Opción 2: Usar PostgreSQL con Docker

### Instalar Docker Desktop

1. Descargar Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Instalar y reiniciar el equipo
3. Iniciar Docker Desktop

### Ejecutar PostgreSQL en Docker

```cmd
docker run --name postgres-bingo ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=bingo_24k ^
  -p 5432:5432 ^
  -d postgres:15
```

### Verificar que está corriendo

```cmd
docker ps
```

---

## Verificar Conexión

Una vez instalado PostgreSQL (cualquier opción), verifica la conexión:

```cmd
cd "c:\Users\User\Documents\24 kilates\server"
node -e "const {Pool}=require('pg');const pool=new Pool({connectionString:'postgresql://postgres:postgres@localhost:5432/bingo_24k'});pool.query('SELECT NOW()',(e,r)=>{console.log(e?'❌ ERROR: '+e.message:'✅ CONEXION OK: '+r.rows[0].now);pool.end()});"
```

**Resultado esperado:**
```
✅ CONEXION OK: 2025-12-05T22:10:15.123Z
```

---

## Después de Instalar PostgreSQL

Una vez que PostgreSQL esté instalado y corriendo, ejecuta:

```cmd
cd "c:\Users\User\Documents\24 kilates\server"
node run_migration.js
```

Esto ejecutará la migración del sistema de tickets.

---

## Configuración de Conexión

Si tu configuración de PostgreSQL es diferente, actualiza el archivo `.env`:

```env
DATABASE_URL=postgresql://usuario:contraseña@host:puerto/bingo_24k
```

Por ejemplo:
```env
DATABASE_URL=postgresql://postgres:mipassword@localhost:5432/bingo_24k
```

---

## Troubleshooting

### Error: "ECONNREFUSED ::1:5432"
**Causa:** PostgreSQL no está corriendo  
**Solución:** 
- Windows: Inicia el servicio desde Servicios de Windows
- Docker: `docker start postgres-bingo`

### Error: "password authentication failed"
**Causa:** Contraseña incorrecta en la conexión  
**Solución:** Actualiza el archivo `.env` con la contraseña correcta

### Error: "database 'bingo_24k' does not exist"
**Causa:** La base de datos no fue creada  
**Solución:** 
```cmd
psql -U postgres -c "CREATE DATABASE bingo_24k;"
```

---

## Resumen de Comandos

```cmd
# 1. Verificar PostgreSQL instalado
psql --version

# 2. Verificar servicio corriendo
Get-Service -Name "*postgres*"

# 3. Conectar a PostgreSQL
psql -U postgres

# 4. Crear base de datos (dentro de psql)
CREATE DATABASE bingo_24k;

# 5. Salir de psql
\q

# 6. Ejecutar migración
cd "c:\Users\User\Documents\24 kilates\server"
node run_migration.js

# 7. Insertar cosméticos
node run_cosmetics_seed.js

# 8. Iniciar servidor
npm run dev
```

---

## Estado Actual del Proyecto

✅ **Backend implementado** (100%)
- shopController.js con 4 funciones
- shopRoutes.js con 3 endpoints
- gameController.js modificado (end_free_game)
- index.js con shopRoutes registrado

✅ **Frontend implementado** (100%)
- ShopScreen.jsx con interfaz completa
- ShopScreen.css con estilos responsive

✅ **Documentación completa** (100%)
- 6 archivos de documentación
- Guías de testing y troubleshooting

✅ **Scripts de migración listos** (100%)
- TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql
- cosmetics_seed.sql
- run_migration.js (Node.js script)
- run_cosmetics_seed.js (Node.js script)

❌ **Base de datos NO configurada** (0%)
- PostgreSQL no instalado
- Base de datos bingo_24k no existe
- Migraciones no ejecutadas

---

## Siguiente Paso

**INSTALA POSTGRESQL** usando una de las opciones arriba, luego ejecuta:

```cmd
node run_migration.js
```
