# 🎁 INSTALACIÓN DEL SISTEMA DE GIFT CARDS

## PROBLEMAS RESUELTOS:
1. ✅ Layout reorganizado - Gift cards aparecen a la derecha
2. ✅ Modal más ancho para acomodar 2 columnas
3. ✅ Errores de carga manejados cuando no existe migración

## ⚠️ PASO CRÍTICO: Ejecutar Migración MySQL

El sistema de gift cards **REQUIERE** ejecutar la migración de base de datos antes de usarlo.

### Opción 1: Ejecutar desde MySQL Workbench

1. Abre MySQL Workbench
2. Conecta a tu servidor local
3. Selecciona la base de datos `bingo_24k`
4. Abre y ejecuta: `server/GIFT_CARDS_MIGRATION.sql`

### Opción 2: Ejecutar desde línea de comandos

```bash
mysql -u root -p bingo_24k < server/GIFT_CARDS_MIGRATION.sql
```

### ¿Qué hace la migración?

1. **Agrega columnas a `users`**:
   - `gift_cards_bronce` (INT)
   - `gift_cards_plata` (INT)
   - `gift_cards_oro` (INT)

2. **Crea tabla `gift_cards_movements`**:
   - Rastrea todos los movimientos de gift cards
   - Auditoría completa (quién, cuándo, cuántos)

3. **Agrega columna a `game_cards`**:
   - `is_gift` (BOOLEAN) - marca cartones regalo usados

## 🚀 DESPUÉS DE LA MIGRACIÓN:

1. Reinicia el servidor backend (si estaba corriendo)
2. Recarga el panel de administración
3. Login como Andy (SuperAdmin)
4. Abre modal de cualquier usuario
5. Verás 2 columnas:
   - **Izquierda**: Cartones Normales
   - **Derecha**: Cartones de Regalo (solo Andy)

## 📝 NOTAS:

- La sección de gift cards es SOLO para Andy (username === 'andy')
- Otros usuarios (incluso SuperAdmins) NO ven esta sección
- El sistema funciona correctamente sin la migración, pero gift cards no estarán disponibles
- Los errores se manejan elegantemente sin crashear

## 🐛 SI HAY ERRORES:

**Error: "Table 'gift_cards_movements' doesn't exist"**
→ Ejecuta la migración MySQL

**Error: "Unknown column 'gift_cards_bronce'"**
→ Ejecuta la migración MySQL

**Gift cards no aparecen en modal**
→ Verifica que el usuario es Andy (username en minúscula)

**Modal muy angosto / no se ven 2 columnas**
→ Recarga la página (Ctrl+F5) para limpiar caché
