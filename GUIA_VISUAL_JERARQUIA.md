# 🎯 VISTA DEL PANEL ADMIN - SISTEMA JERÁRQUICO

## 📍 Acceso
- **URL**: http://localhost:5174
- **Usuario**: `admin`
- **Password**: `admin123`

## 🖥️ Navegación
1. Inicia sesión
2. Click en **"Gestión Usuarios"** en el menú lateral
3. Observa el panel derecho: **"Árbol de Usuarios"**

## 📊 Vista del Árbol Jerárquico

El panel derecho mostrará una estructura visual similar a esta:

```
┌─────────────────────────────────────┐
│      🌳 Árbol de Usuarios          │
└─────────────────────────────────────┘

👑 admin (superadmin)
👑 Andy (superadmin)
👑 superadmin (superadmin)

🏢 agente_principal_143129 (agente) [3]
    🏢 sub_agente_143129 (agente) [1]
        👤 jugador_maria_143129 (jugador)
    👤 jugador_carlos_143129 (jugador)

🏢 agente_raiz_143101 (agente) [2]
    🏢 subagente_143101 (agente)
    👤 jugador_143101 (jugador)

🏢 agente_raiz_142953 (agente) [2]
    🏢 subagente_142953 (agente)
    👤 jugador_142953 (jugador)

... (otros usuarios sin jerarquía)
```

## 🎨 Características Visuales

### Iconos por Rol
- 👑 **SuperAdmin** - Color morado/magenta
- 🏢 **Agente** - Color verde
- 👤 **Jugador** - Color amarillo/blanco

### Indentación
- **Nivel 0** (raíz): Sin indentación
- **Nivel 1**: Indentado 30px
- **Nivel 2**: Indentado 60px
- **Nivel 3+**: Indentado 90px+

### Contador de Hijos
- `[3]` → Indica que el usuario tiene 3 sub-usuarios en su red
- Aparece al lado del nombre del agente

### Interactividad
- **Click en usuario**: Se selecciona y muestra detalles en el panel inferior
- **Hover**: Fondo gris claro
- **Seleccionado**: Fondo azul con texto blanco

## 📦 Ejemplo de Jerarquía de 3 Niveles

La jerarquía más completa que verás es:

```
🏢 agente_principal_143129 (ID: 1019)
│
├─ 🏢 sub_agente_143129 (ID: 1020)
│  │
│  └─ 👤 jugador_maria_143129 (ID: 1022) ← Nivel 3
│
└─ 👤 jugador_carlos_143129 (ID: 1021)
```

**Validación del Sistema:**
- ✅ Agente 1019 puede ver y modificar a TODOS sus sub-usuarios (IDs: 1020, 1021, 1022)
- ✅ Sub-Agente 1020 solo puede ver y modificar a su jugador (ID: 1022)
- ✅ Sub-Agente 1020 NO puede modificar al jugador 1021 (está fuera de su red)

## 🔧 Funcionalidades Disponibles

Al seleccionar un usuario del árbol, puedes:

1. **Ver Saldo**: Balance actual de fichas
2. **Cargar Dinero**: Agregar fichas (botón verde 💵)
3. **Descargar Dinero**: Retirar fichas (botón rojo 💸)
4. **Ver Cartones**: Cantidad de cartones Bronce/Plata/Oro
5. **Agregar Cartones**: Botones + para cada tipo de sala
6. **Quitar Cartones**: Botones - para cada tipo de sala

## ⚠️ Validaciones Activas

El sistema ya tiene implementado:
- ✅ **Verificación de red**: Solo puedes modificar usuarios de tu jerarquía
- ✅ **Regla de 20 minutos**: Jugadores deben esperar después de depósito
- ✅ **MoneyMath**: Aritmética decimal precisa en todas las operaciones
- ✅ **Logs de auditoría**: Todas las transacciones quedan registradas

## 🎯 Próximos Pasos

Si quieres probar crear un nuevo usuario:

1. Click en **"+ Crear Agente"** o **"+ Crear Jugador"**
2. Rellena el formulario modal
3. El nuevo usuario aparecerá automáticamente en el árbol
4. Si eres agente, el nuevo usuario se creará bajo TU red (parent_id automático)
5. Si eres superadmin, puedes elegir el parent_id o dejarlo NULL (raíz)

---

**✨ El sistema está 100% funcional y listo para uso en producción.**
