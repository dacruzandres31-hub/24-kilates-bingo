# Script para cargar $1,000,000 al usuario admin

Write-Host "Cargando recursos al usuario admin..." -ForegroundColor Yellow

# Pedir contraseña de MySQL
$password = Read-Host "Ingresa la contraseña de MySQL root" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Ejecutar el UPDATE
$query = "UPDATE users SET balance = balance + 1000000 WHERE username = 'admin';"
$query | mysql -u root -p"$plainPassword" bingo_24k

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Recursos cargados exitosamente!" -ForegroundColor Green
    
    # Verificar el balance
    Write-Host "`nVerificando balance actualizado..." -ForegroundColor Cyan
    "SELECT username, role, balance FROM users WHERE username = 'admin';" | mysql -u root -p"$plainPassword" bingo_24k
} else {
    Write-Host "❌ Error al cargar recursos" -ForegroundColor Red
}

# Limpiar la contraseña de la memoria
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
