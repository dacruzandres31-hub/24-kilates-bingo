# 🐛 ISSUE PENDIENTE: Efectos visuales en grilla de números

## Problema
Los efectos visuales cuando se marcan números en la grilla de números cantados no funcionan correctamente:

### Síntomas:
- ❌ Aparecen círculos negros estirados en lugar de los efectos diseñados
- ❌ No se muestran los símbolos/emojis (✨ estrellitas para Bronce, 🎉 fuegos artificiales para Starter)
- ❌ El efecto aparece distorsionado visualmente

### Salas afectadas:
- **Sala Bronce** (`BronzeRoomIndustrial.css`)
- **Sala Starter** (`StarterRoom.css`)

### Efectos esperados:

#### Sala Bronce:
- **Números recientes** (último cantado): ✨ Estrellitas doradas que flotan hacia arriba
  - Selector: `.grid-number.recent::after`
  - Animación: `sparkle-float`
  - Ubicación en CSS: línea ~3588

- **Números ya cantados**: Borde dorado con efecto ripple sutil
  - Selector: `.grid-number.called:not(.recent)::after`
  - Animación: `ripple-subtle`
  - Ubicación en CSS: línea ~3567

#### Sala Starter:
- **Números recientes**: 🎉 Fuegos artificiales con rotación
  - Selector: `.grid-number.recent::after`
  - Animación: `firework-burst`
  - Ubicación en CSS: línea ~3552

- **Números ya cantados**: Círculo ripple colorido
  - Selector: `.grid-number.called:not(.recent)::after`
  - Animación: `ripple-strong`

### Trabajo realizado (sin éxito):
1. ✅ Eliminadas definiciones CSS duplicadas de `::after`
2. ✅ Agregado keyframe `ripple-subtle` faltante
3. ✅ Separados efectos con `:not(.recent)` para evitar conflictos
4. ❌ Los círculos negros siguen apareciendo

### Posibles causas a investigar:
- [ ] Conflicto con otros pseudo-elementos `::before` o `::after`
- [ ] Problema de especificidad CSS (otras reglas sobrescribiendo)
- [ ] Issue con el renderizado de emojis en ciertos navegadores
- [ ] Estilos inline o JavaScript modificando los elementos
- [ ] Problema con z-index o posicionamiento

### Archivos involucrados:
- `client-player/src/styles/BronzeRoomIndustrial.css`
- `client-player/src/styles/StarterRoom.css`
- `client-player/src/components/BronzeRoom.jsx` (verifica clases aplicadas)
- `client-player/src/components/StarterRoom.jsx` (verifica clases aplicadas)

### Próximos pasos para debuggear:
1. Inspeccionar con DevTools qué estilos `::after` se están aplicando realmente
2. Verificar que las clases `called` y `recent` se están aplicando correctamente desde JavaScript
3. Revisar si hay estilos globales que puedan estar afectando
4. Probar con emojis diferentes o iconos SVG en lugar de emojis Unicode
5. Verificar orden de carga de CSS y especificidad de selectores

---

**Prioridad**: Media  
**Estado**: Pendiente  
**Fecha**: 2025-12-10  
**Decisión**: Continuar con otras tareas y retomar más adelante
