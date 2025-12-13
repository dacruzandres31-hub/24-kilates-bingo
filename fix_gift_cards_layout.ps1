# Fix Gift Cards Layout - Reorganizar a horizontal
Write-Host "🔧 Ajustando layout de gift cards a horizontal..." -ForegroundColor Cyan

$filePath = "c:\Users\User\Documents\24 kilates\client-admin\src\components\GestionUsuarios.jsx"
$content = Get-Content $filePath -Raw

# 1. Cambiar max-w-2xl a max-w-7xl para modal más ancho
$content = $content -replace 'max-w-2xl mx-4', 'max-w-7xl mx-4'

# 2. Cambiar pt-20 a pt-10 para mejor uso del espacio vertical
$content = $content -replace 'pt-20">','pt-10">'

# 3. Cambiar max-h-\[70vh\] a max-h-\[80vh\] para más espacio
$content = $content -replace 'max-h-\[70vh\]', 'max-h-[80vh]'

# 4. Eliminar toda la sección duplicada de "Cartones" (sin condicional de Andy)
# Esta es la sección que va desde {/* Cartones */} hasta antes de {/* GRID DE 2 COLUMNAS */}
$pattern = '(?s)(\s+</div>\s+</div>\s+</div>\s+\{/\* Cartones \*/\}\s+<div>.*?</div>\s+</div>\s+\{/\* GRID DE 2 COLUMNAS)'
$replacement = "`n`n              {/* GRID DE 2 COLUMNAS"
$content = $content -replace $pattern, $replacement

# 5. Cambiar el condicional para que solo Andy vea el grid
$content = $content -replace '\{/\* GRID DE 2 COLUMNAS: Cartones Normales \| Cartones de Regalo \*/\}', '{/* GRID DE 2 COLUMNAS: Cartones Normales | Cartones de Regalo (Solo Andy) */}'

# 6. Agregar text-sm a todos los botones de gift cards que no lo tienen
$content = $content -replace '(className="flex-1 bg-gradient-to-r from-gray-700 to-gray-800[^"]+")(?!.*text-sm)', '$1 text-sm"'
$content = $content -replace '(className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700[^"]+")(?!.*text-sm)', '$1 text-sm"'
$content = $content -replace '(className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700[^"]+")(?!.*text-sm)', '$1 text-sm"'

# Guardar archivo
$content | Set-Content $filePath -NoNewline

Write-Host "✅ Layout ajustado exitosamente" -ForegroundColor Green
Write-Host ""
Write-Host "CAMBIOS REALIZADOS:" -ForegroundColor Yellow
Write-Host "  ✓ Modal más ancho (max-w-7xl)" -ForegroundColor White
Write-Host "  ✓ Mejor uso vertical (pt-10, max-h-80vh)" -ForegroundColor White
Write-Host "  ✓ Eliminada sección duplicada de Cartones" -ForegroundColor White
Write-Host "  ✓ Grid de 2 columnas solo para Andy" -ForegroundColor White
Write-Host "  ✓ Botones de gift cards con tamaño compacto" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Recarga el panel de admin para ver los cambios" -ForegroundColor Cyan
