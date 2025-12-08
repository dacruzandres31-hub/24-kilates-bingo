# Barra Lateral de Usuario - Implementación

## 📋 Resumen

Se implementó una **barra lateral desplegable (sidebar)** en las salas de juego que contiene toda la información del usuario que antes estaba en el lobby, manteniendo así la inmersión visual y el máximo espacio útil para el juego.

## 🎯 ¿Por qué sidebar en lugar de barra superior?

### Ventajas del Sidebar Desplegable:
1. **Espacio crítico**: Las salas necesitan toda la pantalla para mostrar:
   - Bolillero y sorteo en tiempo real
   - Múltiples cartones de bingo
   - Grid de números (1-90)
   - Celebraciones y notificaciones

2. **Experiencia inmersiva**: La barra superior competiría visualmente con elementos críticos del juego (bolillero, últimos números, etc.)

3. **UX mejorada**: 
   - El usuario solo ve info cuando la necesita
   - Acceso rápido con un solo toque
   - No obstaculiza la visión del juego
   - Animaciones suaves y modernas

4. **Mobile-friendly**: Ocupa 100% del ancho en móviles sin comprometer el layout del juego

## 📦 Componentes Creados

### 1. `PlayerSidebar.jsx`
Componente React reutilizable para todas las salas.

**Props:**
- `isOpen` (boolean): Estado de apertura del sidebar
- `onToggle` (function): Callback para abrir/cerrar

**Características:**
- ✅ Información del usuario (username)
- ✅ Saldo con toggle show/hide (botón de ojo)
- ✅ Contadores de cartones por sala (Starter, Bronce, Plata, Oro)
- ✅ Botón "Volver al Lobby" (con navegación)
- ✅ Botón "Soporte Técnico"
- ✅ Animaciones smooth (cubic-bezier)
- ✅ Overlay con blur backdrop
- ✅ Scrollable (para contenido extenso)
- ✅ Responsive (100% width en móviles)

### 2. `PlayerSidebar.css`
Estilos completos con tema neón 24K.

**Elementos estilizados:**
- Botón flotante de apertura (esquina superior izquierda)
- Overlay con blur
- Sidebar con gradiente oscuro + borde neón cian
- Colores específicos por sala (Starter: cian, Bronce: cobre, Plata: plata, Oro: dorado)
- Scrollbar personalizado
- Animaciones de hover y transiciones

## 🔧 Integración en StarterRoom

### Código agregado:

```jsx
// Import
import PlayerSidebar from './PlayerSidebar';

// Estado
const [sidebarOpen, setSidebarOpen] = useState(false);

// JSX
<PlayerSidebar 
  isOpen={sidebarOpen} 
  onToggle={() => setSidebarOpen(!sidebarOpen)} 
/>
```

## 🎨 Diseño Visual

### Botón Flotante:
- **Posición**: Fixed, top-left (20px, 20px)
- **Estilo**: Círculo transparente con borde neón cian
- **Icono**: `FaBars` (hamburger menu)
- **Hover**: Scale 1.1 + glow intenso

### Sidebar:
- **Ancho**: 350px (desktop), 100% (mobile)
- **Animación entrada**: Left slide con ease-out
- **Background**: Gradiente oscuro con blur backdrop
- **Borde derecho**: 3px neón cian con sombra

### Secciones:

1. **Header**:
   - Título "MI PERFIL" en mayúsculas con glow
   - Botón cerrar (X) rotando en hover

2. **Usuario**:
   - Icono user con gradiente cian-magenta
   - Username destacado en cian

3. **Saldo**:
   - Icono bronze_icon.png
   - Monto en color dorado ($12,500)
   - Toggle eye/eye-slash para mostrar/ocultar

4. **Mis Cartones**:
   - Lista de 4 salas
   - Cada sala con color de borde específico
   - Contador en badge neón
   - Hover con glow effect

5. **Acciones**:
   - Botón "Volver al Lobby" (gradiente cian)
   - Botón "Soporte" (gradiente magenta)
   - Hover: lift effect + glow

6. **Footer**:
   - Versión "v1.3.0" en texto tenue

## 🔌 TODO: Integración con Backend

Actualmente usa datos mock. Para conectar con API:

```javascript
useEffect(() => {
  const fetchUserData = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/user/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setUserData({
      username: data.username,
      balance: data.balance,
      tickets: data.tickets // { starter: 3, bronze: 5, ... }
    });
  };
  fetchUserData();
}, []);
```

## 📱 Responsive

### Desktop (> 768px):
- Sidebar: 350px width
- Slide desde left: -350px → 0

### Mobile (≤ 768px):
- Sidebar: 100% width
- Slide desde left: -100% → 0
- Botón flotante: Tamaño reducido (45px)

## 🚀 Próximos Pasos

1. **Replicar en otras salas**: Bronze, Silver, Gold
2. **Conectar con API real**: Endpoint `/api/user/profile`
3. **Agregar funcionalidad soporte**: Modal de chat o redirección
4. **Animaciones avanzadas**: Confetti al ganar, pulse en notificaciones
5. **Persistencia**: Recordar estado abierto/cerrado en localStorage
6. **Notificaciones**: Badge con contador de mensajes no leídos

## 🎯 Archivos Modificados

```
client-player/
├── src/
│   ├── components/
│   │   ├── PlayerSidebar.jsx         ✅ NUEVO
│   │   └── StarterRoom.jsx            ✅ MODIFICADO (import + estado + JSX)
│   └── styles/
│       └── PlayerSidebar.css          ✅ NUEVO
```

## 💡 Notas de Diseño

- **Z-index layers**:
  - Sidebar: 1001
  - Overlay: 1000
  - Botón flotante: 999
  - Celebración modal: 1000 (no interfiere)

- **Performance**: 
  - Usa `transition` CSS en lugar de animaciones JS
  - `backdrop-filter: blur()` para efecto premium
  - `will-change` en elementos animados (considerar si hay lag)

- **Accesibilidad**:
  - TODO: Agregar `aria-label` en botones
  - TODO: Soporte para teclado (ESC para cerrar)
  - TODO: Focus trap cuando está abierto

---

**Implementado por**: GitHub Copilot  
**Fecha**: Diciembre 8, 2025  
**Versión**: v1.3.0
