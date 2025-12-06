# MÓDULO 7: API del Dashboard Administrativo

Sistema completo de estadísticas y monitoreo en tiempo real para administradores.

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Endpoints Disponibles](#endpoints-disponibles)
3. [Estructura de Datos](#estructura-de-datos)
4. [Reglas de Negocio](#reglas-de-negocio)
5. [Socket.IO - Mensajes Globales](#socketio---mensajes-globales)
6. [Ejemplos de Uso](#ejemplos-de-uso)
7. [Integración con Frontend](#integración-con-frontend)

---

## 📊 Descripción General

El **MÓDULO 7** proporciona una API REST completa para el panel de administración con:

- **Estadísticas consolidadas** del sistema en tiempo real
- **Distribución financiera** según reglas del negocio (10% casa, 5% admins, 15% cajeros, 70% pozos)
- **Estado de pozos** actuales (3 líneas, 3 bingos, 3 acumulativos)
- **Usuarios y roles** (jugadores, cajeros, admins, superadmins)
- **Mensajes globales** vía Socket.IO (anuncios de sistema)
- **Alertas automáticas** (retiros pendientes, sesiones inactivas, etc.)

**Ventajas:**
- ⚡ **Consultas paralelas** con `Promise.all()` para máxima velocidad
- 💰 **Cálculos precisos** con MoneyMath (decimal.js)
- 🔒 **Protección por roles** (solo admins/superadmins)
- 📢 **Broadcasting en tiempo real** con Socket.IO

---

## 🔗 Endpoints Disponibles

### 1. GET `/api/admin/dashboard/stats`

**Estadísticas consolidadas del sistema**

**Autenticación:** JWT + Role `admin` o `superadmin`

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "usuarios": {
      "total": 1250,
      "jugadores": 1100,
      "cajeros": 25,
      "admins": 5,
      "superadmins": 2
    },
    "finanzas_hoy": {
      "ventas_brutas": 150000.00,
      "ventas_netas": 120000.00,
      "total_retiros": 30000.00,
      "total_apuestas": 100000.00,
      "total_premios": 70000.00,
      
      "ganancia_casa_10": 12000.00,
      "comisiones_admin_5": 6000.00,
      "comisiones_cajero_15": 18000.00,
      "para_pozos_70": 84000.00,
      
      "usuarios_activos_hoy": 350
    },
    "juego": {
      "sesiones_activas": 2,
      "sesiones_pendientes": 3,
      "sesiones_completadas_hoy": 12,
      
      "pozos": {
        "total_linea": 45000.00,
        "total_bingo": 135000.00,
        "total_acumulativo": 250000.00,
        "suma_total": 430000.00
      },
      
      "proximas_sesiones": [
        {
          "id": 123,
          "sala": "sala1",
          "pozo_linea": 15000.00,
          "pozo_bingo": 45000.00,
          "pozo_acumulativo": 80000.00,
          "inicio_estimado": "2025-12-05T20:00:00.000Z"
        }
      ]
    },
    "sistema": {
      "balance_total_usuarios": 500000.00,
      "usuarios_con_saldo": 450,
      "estado_servidor": "ONLINE 🟢",
      "timestamp": "2025-12-05T19:30:00.000Z"
    },
    "retiros": {
      "pendientes_count": 8,
      "pendientes_monto": 35000.00,
      "requiere_atencion": true
    },
    "movimientos_recientes": [
      {
        "id": 5432,
        "usuario": "jugador_123",
        "tipo": "win",
        "monto": 15000.00,
        "balance_resultante": 20000.00,
        "razon": "Premio LÍNEA - Sesión 45",
        "fecha": "2025-12-05T19:25:00.000Z"
      }
    ],
    "alertas": [
      {
        "tipo": "warning",
        "mensaje": "8 retiros pendientes por $35.000,00",
        "accion": "/admin/withdrawals"
      }
    ]
  }
}
```

**Uso:**
```javascript
fetch('http://localhost:3001/api/admin/dashboard/stats', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('Ganancia casa:', data.data.finanzas_hoy.ganancia_casa_10);
  console.log('Retiros pendientes:', data.data.retiros.pendientes_count);
});
```

---

### 2. POST `/api/admin/broadcast`

**Enviar mensaje global a todos los usuarios conectados**

**Autenticación:** JWT + Role `admin` o `superadmin`

**Body:**
```json
{
  "message": "Mantenimiento programado en 10 minutos. Finalicen sus partidas.",
  "type": "warning",
  "priority": "high"
}
```

**Parámetros:**
- `message` (string, requerido): Texto del mensaje
- `type` (string, opcional): Tipo de notificación (`info`, `warning`, `success`, `error`)
- `priority` (string, opcional): Prioridad (`low`, `medium`, `high`)

**Respuesta:**
```json
{
  "success": true,
  "message": "Anuncio enviado a toda la red",
  "recipients": 350,
  "notification": {
    "text": "Mantenimiento programado en 10 minutos",
    "type": "warning",
    "priority": "high",
    "timestamp": "2025-12-05T19:30:00.000Z",
    "sender": "SISTEMA"
  }
}
```

**Efecto:**
Todos los clientes conectados vía Socket.IO recibirán el evento `admin_notification`:

```javascript
// Cliente (React/Vue)
socket.on('admin_notification', (notification) => {
  showToast({
    message: notification.text,
    type: notification.type,
    priority: notification.priority
  });
});
```

---

### 3. GET `/api/admin/sessions/stats`

**Estadísticas de sesiones de juego**

**Query Parameters:**
- `period` (string, opcional): Período de análisis (`today`, `week`, `month`)

**Ejemplo:**
```
GET /api/admin/sessions/stats?period=week
```

**Respuesta:**
```json
{
  "success": true,
  "period": "week",
  "data": {
    "total_sesiones": 84,
    "total_cartones_vendidos": 12600,
    "ingresos_totales": 1260000.00,
    "duracion_promedio_minutos": 25,
    "sesiones_completadas": 80,
    "tasa_completado": "95.24%"
  }
}
```

---

### 4. GET `/api/admin/users/stats`

**Estadísticas detalladas de usuarios**

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total_usuarios": 1250,
    "usuarios_con_saldo": 450,
    "balance_total_sistema": 500000.00,
    "balance_promedio": 400.00,
    "balance_maximo": 50000.00,
    "nuevos_hoy": 15,
    "activos_hoy": 350,
    
    "top_usuarios": [
      {
        "id": 42,
        "username": "lucky_player",
        "balance": 50000.00,
        "role": "player",
        "created_at": "2025-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 5. GET `/api/admin/revenue/breakdown`

**Desglose detallado de ingresos y distribución**

**Query Parameters:**
- `date` (string, opcional): Fecha en formato `YYYY-MM-DD` (por defecto: hoy)

**Ejemplo:**
```
GET /api/admin/revenue/breakdown?date=2025-12-05
```

**Respuesta:**
```json
{
  "success": true,
  "date": "2025-12-05",
  "data": {
    "ingresos": {
      "depositos": 150000.00,
      "transacciones": 350
    },
    "egresos": {
      "retiros": 30000.00,
      "premios": 70000.00,
      "transacciones": 120
    },
    "balance_neto": 120000.00,
    
    "distribucion": {
      "casa_10": 12000.00,
      "admins_5": 6000.00,
      "cajeros_15": 18000.00,
      "pozos_70": 84000.00
    },
    
    "movimientos_detalle": {
      "deposit": { "total": 150000.00, "count": 350 },
      "withdrawal": { "total": 30000.00, "count": 80 },
      "win": { "total": 70000.00, "count": 40 },
      "bet": { "total": 100000.00, "count": 1260 }
    }
  }
}
```

---

## 📐 Reglas de Negocio

### Distribución de Ingresos

Todos los cálculos se basan en **ventas netas** (depósitos - retiros):

| Concepto | Porcentaje | Destino |
|----------|------------|---------|
| **Casa** | 10% | Ganancia neta del negocio |
| **Admins** | 5% | Deuda con socios/inversores |
| **Cajeros** | 15% | Comisiones a vendedores |
| **Pozos** | 70% | Premios (línea + bingo + acumulativo) |

**Ejemplo:**
```
Ventas Netas del Día: $120.000

- Casa (10%):     $12.000 ← Tu ganancia limpia
- Admins (5%):     $6.000 ← Debes repartir a socios
- Cajeros (15%):  $18.000 ← Comisiones vendedores
- Pozos (70%):    $84.000 ← Distribución en 3 salas
```

**Implementación:**
```javascript
// Usando MoneyMath para precisión
const ventasNetas = 120000;

const distribucion = {
  casa: MoneyMath.percentage(ventasNetas, 10),      // 12000.00
  admins: MoneyMath.percentage(ventasNetas, 5),     // 6000.00
  cajeros: MoneyMath.percentage(ventasNetas, 15),   // 18000.00
  pozos: MoneyMath.percentage(ventasNetas, 70)      // 84000.00
};
```

---

## 📢 Socket.IO - Mensajes Globales

### Configuración del Cliente

**React/Vue:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: localStorage.getItem('jwt')
  }
});

// Escuchar anuncios del sistema
socket.on('admin_notification', (notification) => {
  const { text, type, priority, timestamp } = notification;
  
  // Mostrar notificación según tipo
  if (type === 'warning') {
    showWarningToast(text);
  } else if (type === 'error') {
    showErrorModal(text);
  } else {
    showInfoToast(text);
  }
  
  // Log para debugging
  console.log(`[ADMIN] ${text} [${type}] at ${timestamp}`);
});
```

### Envío desde Backend

**Opción 1: Desde Controller (adminController.js)**
```javascript
const io = req.app.get('io');
io.emit('admin_notification', {
  text: 'Servidor reiniciándose en 1 minuto',
  type: 'error',
  priority: 'high'
});
```

**Opción 2: Desde cualquier servicio**
```javascript
const app = require('../index'); // Importar app
const io = app.get('io');

io.emit('admin_notification', {
  text: 'Nueva sesión de bingo iniciada',
  type: 'info',
  priority: 'medium'
});
```

---

## 💻 Ejemplos de Uso

### Dashboard Principal (Frontend)

**React Hook para Dashboard:**
```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

function useDashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/admin/dashboard/stats', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('jwt')}`
          }
        });
        setStats(response.data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stats, loading, error };
}

// Componente Dashboard
function AdminDashboard() {
  const { stats, loading, error } = useDashboardStats();

  if (loading) return <Spinner />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div className="dashboard">
      <h1>Panel de Control</h1>
      
      {/* Métricas Financieras */}
      <div className="financial-cards">
        <MetricCard 
          title="Ganancia Casa (10%)"
          value={stats.finanzas_hoy.ganancia_casa_10}
          format="currency"
          color="green"
        />
        <MetricCard 
          title="Deuda Admins (5%)"
          value={stats.finanzas_hoy.comisiones_admin_5}
          format="currency"
          color="orange"
        />
        <MetricCard 
          title="Comisiones Cajeros (15%)"
          value={stats.finanzas_hoy.comisiones_cajero_15}
          format="currency"
          color="blue"
        />
      </div>

      {/* Estado de Pozos */}
      <div className="pots-section">
        <h2>Estado de Pozos</h2>
        <PotDisplay 
          linea={stats.juego.pozos.total_linea}
          bingo={stats.juego.pozos.total_bingo}
          acumulativo={stats.juego.pozos.total_acumulativo}
        />
      </div>

      {/* Alertas */}
      {stats.alertas.length > 0 && (
        <AlertsPanel alerts={stats.alertas} />
      )}

      {/* Sesiones Próximas */}
      <SessionsList sessions={stats.juego.proximas_sesiones} />

      {/* Movimientos Recientes */}
      <RecentMovements movements={stats.movimientos_recientes} />
    </div>
  );
}
```

---

### Envío de Mensaje Global

**Componente React:**
```javascript
function BroadcastPanel() {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);

  const sendBroadcast = async () => {
    setSending(true);
    try {
      const response = await axios.post(
        '/api/admin/broadcast',
        { message, type, priority: 'high' },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('jwt')}`
          }
        }
      );
      
      alert(`Mensaje enviado a ${response.data.recipients} usuarios`);
      setMessage('');
    } catch (error) {
      alert('Error enviando mensaje: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="broadcast-panel">
      <h2>Enviar Anuncio Global</h2>
      
      <textarea 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escribe tu mensaje..."
        rows={4}
      />

      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="info">📢 Información</option>
        <option value="warning">⚠️ Advertencia</option>
        <option value="success">✅ Éxito</option>
        <option value="error">❌ Error</option>
      </select>

      <button 
        onClick={sendBroadcast}
        disabled={!message || sending}
      >
        {sending ? 'Enviando...' : 'Enviar a Todos'}
      </button>
    </div>
  );
}
```

---

## 🚀 Integración Completa

### 1. Verificar que el servidor está levantado

```bash
cd server
npm run dev
```

### 2. Probar endpoint de estadísticas

```bash
curl http://localhost:3001/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Probar envío de mensaje global

```bash
curl -X POST http://localhost:3001/api/admin/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Prueba de mensaje global",
    "type": "info"
  }'
```

### 4. Conectar frontend con Socket.IO

```javascript
// En tu App.jsx o main component
import io from 'socket.io-client';

useEffect(() => {
  const socket = io('http://localhost:3001');
  
  socket.on('admin_notification', (notification) => {
    toast[notification.type](notification.text);
  });

  return () => socket.disconnect();
}, []);
```

---

## ✅ Checklist de Implementación

- [x] Crear `adminController.js` con 5 endpoints
- [x] Crear `adminRoutes.js` con protección por roles
- [x] Integrar rutas en `index.js`
- [x] Almacenar instancia de Socket.IO en `app`
- [x] Usar MoneyMath para todos los cálculos financieros
- [x] Consultas paralelas con `Promise.all()`
- [ ] Crear tabla `system_notifications` (opcional)
- [ ] Testing con Postman/Thunder Client
- [ ] Documentación Swagger/OpenAPI
- [ ] Frontend React/Vue para dashboard
- [ ] Notificaciones push (optional)

---

## 📊 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD (React)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Finanzas │  │  Pozos   │  │ Usuarios │  │ Alertas  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (JWT Auth)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                /api/admin/* (adminRoutes.js)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           adminController.js (MÓDULO 7)              │  │
│  │  - getDashboardStats()                               │  │
│  │  - sendGlobalMessage()                               │  │
│  │  - getSessionStats()                                 │  │
│  │  - getUserStats()                                    │  │
│  │  - getRevenueBreakdown()                             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   MySQL DB   │  │  MoneyMath   │  │  Socket.IO   │
│  (queries)   │  │  (cálculos)  │  │ (broadcast)  │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🎯 Próximos Pasos

1. **Testing:** Crear tests unitarios para cada endpoint
2. **Frontend:** Implementar dashboard React/Vue con gráficos
3. **Reportes:** Agregar exportación a PDF/Excel
4. **Notificaciones:** Integrar Firebase Cloud Messaging
5. **Monitoreo:** Agregar Sentry para error tracking
6. **Performance:** Implementar caché con Redis

---

**MÓDULO 7 COMPLETADO** ✅

Sistema de dashboard administrativo operacional con:
- 5 endpoints RESTful
- Cálculos precisos con MoneyMath
- Broadcasting en tiempo real con Socket.IO
- Protección por roles (admin/superadmin)
- Alertas automáticas
- Estadísticas consolidadas

**Listo para integración frontend** 🚀
