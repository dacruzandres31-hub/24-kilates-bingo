# Script para actualizar Andy a SuperAdmin
Write-Host "🔧 Actualizando rol de Andy a SuperAdmin..." -ForegroundColor Cyan

# Ejecutar comando MySQL
$query = "UPDATE users SET role = 'superadmin' WHERE username = 'Andy';"

mysql -u root -p bingo_24k -e $query

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Andy ahora es SuperAdmin" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 Próximos pasos:" -ForegroundColor Yellow
    Write-Host "1. Cierra sesión en el panel de admin" -ForegroundColor White
    Write-Host "2. Vuelve a iniciar sesión con las credenciales de Andy" -ForegroundColor White
    Write-Host "3. El panel debería mostrarse correctamente" -ForegroundColor White
} else {
    Write-Host "❌ Error actualizando rol. Verifica que MySQL esté corriendo." -ForegroundColor Red
}

Read-Host "`nPresiona Enter para cerrar"
