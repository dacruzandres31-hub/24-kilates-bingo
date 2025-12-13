# ========================================
# CHECKLIST MANUAL DE PRUEBAS
# Funcionalidades 12 de Diciembre 2025
# ========================================

## 📋 INSTRUCCIONES

Abre el navegador en: http://localhost:5175

Credenciales SuperAdmin:
- Usuario: Andy
- Contraseña: andy2024

---

## ✅ PRUEBA 1: Login y Perfil SuperAdmin

[ ] 1.1. Hacer login con Andy / andy2024
[ ] 1.2. Login exitoso → Redirige al Dashboard
[ ] 1.3. Ver nombre de usuario en la esquina superior derecha

**RESULTADO ESPERADO**: Login funciona correctamente

---

## ✅ PRUEBA 2: Verificar Jerarquía (Andy como Root)

[ ] 2.1. Ir a "Gestión de Usuarios"
[ ] 2.2. Ver árbol de usuarios
[ ] 2.3. Verificar que Andy está en la parte superior
[ ] 2.4. Verificar que Andy NO tiene padre (es root)
[ ] 2.5. Ver que otros usuarios están bajo Andy

**RESULTADO ESPERADO**: Andy es el único SuperAdmin root del sistema

---

## ✅ PRUEBA 3: Panel de Recursos Disponibles

[ ] 3.1. En "Gestión de Usuarios", ver panel superior "Recursos Disponibles"
[ ] 3.2. Ver badge dorado "SUPERADMIN"
[ ] 3.3. Ver formato de balance con separadores: $10.000.000 (puntos cada 3 dígitos)
[ ] 3.4. Ver cartones Bronce, Plata, Oro con separadores: 25.000
[ ] 3.5. Ver botones "+" verdes a la derecha de cada recurso (solo para SuperAdmin)

**RESULTADO ESPERADO**: 
- Badge "SUPERADMIN" visible
- Números con separadores de miles (puntos)
- Botones "+" verdes visibles solo para Andy

---

## ✅ PRUEBA 4: Agregar Recursos Ilimitados (Botón +)

[ ] 4.1. Click en botón "+" del Balance
[ ] 4.2. Se abre modal dorado "SuperAdmin: Agregar Balance Ilimitado"
[ ] 4.3. Ingresar cantidad: 1000000
[ ] 4.4. Click en "CONFIRMAR"
[ ] 4.5. Ver que el balance aumentó en el panel

[ ] 4.6. Click en botón "+" de Cartones Bronce
[ ] 4.7. Ingresar cantidad: 500
[ ] 4.8. Confirmar
[ ] 4.9. Ver que los cartones bronce aumentaron

**RESULTADO ESPERADO**: 
- Modal se abre correctamente
- Recursos se agregan sin límite
- Panel se actualiza inmediatamente
- Formato mantiene separadores de miles

---

## ✅ PRUEBA 5: Crear Usuario Nuevo

[ ] 5.1. Click en botón "NUEVO AGENTE" (esquina superior derecha)
[ ] 5.2. Se abre modal "Crear Nuevo Usuario"
[ ] 5.3. Ingresar datos:
        - Usuario: test_agente_123
        - Contraseña: test123
        - Role: agente
[ ] 5.4. Click en "CREAR USUARIO"
[ ] 5.5. Aparece mensaje de éxito
[ ] 5.6. Usuario aparece en el árbol bajo Andy

**RESULTADO ESPERADO**: Usuario creado correctamente y visible en jerarquía

---

## ✅ PRUEBA 6: Cargar Balance a Usuario (Verificar Descuento)

[ ] 6.1. Click en el usuario recién creado (test_agente_123)
[ ] 6.2. Se abre modal de gestión del usuario
[ ] 6.3. Click en "Cargar Dinero"
[ ] 6.4. Ingresar cantidad: 100000
[ ] 6.5. Confirmar la operación
[ ] 6.6. Ver mensaje de éxito

[ ] 6.7. Cerrar modal
[ ] 6.8. **IMPORTANTE**: Verificar que el balance en "Recursos Disponibles" disminuyó en 100.000
[ ] 6.9. Abrir nuevamente el modal del usuario
[ ] 6.10. Verificar que el usuario tiene balance de 100.000

**RESULTADO ESPERADO**: 
- Balance se carga correctamente al usuario
- **Panel de Recursos se descuenta automáticamente** (FIX del 12-dic)
- Formato mantiene separadores

---

## ✅ PRUEBA 7: Descargar Balance de Usuario

[ ] 7.1. Con el modal del usuario abierto, click en "Descargar Dinero"
[ ] 7.2. Ingresar cantidad: 50000
[ ] 7.3. Confirmar
[ ] 7.4. Ver mensaje de éxito

[ ] 7.5. Cerrar modal
[ ] 7.6. **IMPORTANTE**: Verificar que el balance en "Recursos Disponibles" aumentó en 50.000
[ ] 7.7. Abrir modal del usuario
[ ] 7.8. Verificar que el usuario ahora tiene 50.000 (100.000 - 50.000)

**RESULTADO ESPERADO**: 
- Balance se descarga del usuario
- **Panel de Recursos aumenta automáticamente** (FIX del 12-dic)

---

## ✅ PRUEBA 8: Formato de Números (Visual)

[ ] 8.1. Verificar que TODOS los balances muestran puntos separadores:
        - $10.000.000
        - $1.500.000
        - $25.000
[ ] 8.2. Verificar que TODOS los cartones muestran puntos separadores:
        - 25.000
        - 1.500
        - 500
[ ] 8.3. Verificar que NO hay decimales en ningún balance
[ ] 8.4. Verificar que NO aparece "NaN" en ningún lugar

**RESULTADO ESPERADO**: 
- Formato consistente con separadores de miles
- Sin decimales
- Sin NaN

---

## ✅ PRUEBA 9: Cambiar Contraseña

[ ] 9.1. Click en el botón de "Perfil" (esquina superior derecha)
[ ] 9.2. Se abre dropdown
[ ] 9.3. Click en "🔑 Cambiar Contraseña"
[ ] 9.4. Se abre modal con formulario de cambio de contraseña

[ ] 9.5. Ingresar datos:
        - Contraseña Actual: andy2024
        - Nueva Contraseña: andy2024_temp
        - Confirmar Nueva Contraseña: andy2024_temp
[ ] 9.6. Click en "✓ CAMBIAR"
[ ] 9.7. Ver mensaje de éxito
[ ] 9.8. Modal se cierra

[ ] 9.9. Cerrar sesión
[ ] 9.10. Intentar login con contraseña antigua (andy2024) → Debe FALLAR
[ ] 9.11. Intentar login con nueva contraseña (andy2024_temp) → Debe FUNCIONAR

[ ] 9.12. Revertir contraseña:
         - Perfil → Cambiar Contraseña
         - Actual: andy2024_temp
         - Nueva: andy2024
         - Confirmar

**RESULTADO ESPERADO**: 
- Modal se abre correctamente
- Validaciones funcionan
- Contraseña se cambia exitosamente
- Login funciona con nueva contraseña

---

## ✅ PRUEBA 10: Validaciones de Contraseña

[ ] 10.1. Abrir modal de cambiar contraseña
[ ] 10.2. Ingresar contraseña actual incorrecta
[ ] 10.3. Click en CAMBIAR
[ ] 10.4. Ver mensaje de error: "La contraseña actual es incorrecta"

[ ] 10.5. Ingresar contraseñas que no coinciden:
         - Nueva: test123
         - Confirmar: test456
[ ] 10.6. Ver mensaje: "Las contraseñas no coinciden"

[ ] 10.7. Ingresar contraseña muy corta (< 6 caracteres):
         - Nueva: abc
[ ] 10.8. Ver mensaje: "La contraseña debe tener al menos 6 caracteres"

**RESULTADO ESPERADO**: Todas las validaciones funcionan correctamente

---

## ✅ PRUEBA 11: Búsqueda de Usuarios

[ ] 11.1. En Gestión de Usuarios, usar el buscador
[ ] 11.2. Escribir "test_agente"
[ ] 11.3. Ver que aparece dropdown con coincidencias
[ ] 11.4. Click en el usuario
[ ] 11.5. Se abre modal de gestión

**RESULTADO ESPERADO**: Búsqueda funciona y abre modal correctamente

---

## ✅ PRUEBA 12: Inserción Masiva de Cartones (Performance)

[ ] 12.1. Click en botón "+" de Cartones Bronce
[ ] 12.2. Ingresar cantidad grande: 5000
[ ] 12.3. Click en CONFIRMAR
[ ] 12.4. **Observar tiempo de respuesta** (debería ser < 2 segundos)
[ ] 12.5. Verificar que los 5.000 cartones se agregaron
[ ] 12.6. Verificar formato: 5.000 (con punto separador)

**RESULTADO ESPERADO**: 
- Inserción rápida (< 2 segundos para 5000)
- Optimización funcionando correctamente

---

## 📊 RESUMEN DE VERIFICACIÓN

Total de features implementadas el 12-dic-2025:

✅ Jerarquía reestructurada (Andy como SuperAdmin root)
✅ Botones "+" para recursos ilimitados (solo SuperAdmin)
✅ Optimización de inserción masiva de cartones
✅ Sistema de cambio de contraseña completo
✅ Corrección de descuento de recursos del panel
✅ Formato de números con separadores de miles
✅ Sin decimales en balances
✅ Validaciones de seguridad

---

## 🐛 REPORTE DE BUGS

Si encuentras algún problema, anota aquí:

BUG #1:
- Descripción:
- Pasos para reproducir:
- Resultado esperado:
- Resultado actual:

BUG #2:
- Descripción:
- Pasos para reproducir:
- Resultado esperado:
- Resultado actual:

---

**FECHA DE PRUEBA**: _______________
**PROBADO POR**: _______________
**RESULTADO GENERAL**: [ ] APROBADO  [ ] FALLAS ENCONTRADAS
