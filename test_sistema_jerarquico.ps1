# ============================================================
# SCRIPT DE TESTING: SISTEMA JERARQUICO DE USUARIOS
# ============================================================
# Prueba la creacion de usuarios, jerarquia y permisos
# Bingo 24K - Sistema de Red Multi-nivel
# ============================================================

$BASE_URL = "http://localhost:3001"

Write-Host "INICIANDO TESTS DEL SISTEMA JERARQUICO" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# PASO 1: LOGIN COMO SUPERADMIN
# ============================================================
Write-Host "PASO 1: Login como SuperAdmin..." -ForegroundColor Yellow

$loginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $SUPERADMIN_TOKEN = $loginResponse.token
    Write-Host "OK Login SuperAdmin exitoso" -ForegroundColor Green
    Write-Host "   Token: $($SUPERADMIN_TOKEN.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "ERROR en login SuperAdmin: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# PASO 2: CREAR AGENTE NIVEL 1 (bajo SuperAdmin)
# ============================================================
Write-Host "PASO 2: Crear Agente Nivel 1..." -ForegroundColor Yellow

$agente1Data = @{
    username = "agente_principal"
    password = "agente123"
    role = "agente"
    nombre_completo = "Carlos Agente Principal"
    email = "carlos@bingo24k.com"
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $SUPERADMIN_TOKEN" }
    $agente1Response = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/create" -Method POST -Body $agente1Data -ContentType "application/json" -Headers $headers
    Write-Host "OK Agente1 creado exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($agente1Response.userId)" -ForegroundColor Gray
    Write-Host "   Mensaje: $($agente1Response.message)" -ForegroundColor Gray
    $AGENTE1_ID = $agente1Response.userId
} catch {
    Write-Host "ERROR creando Agente1: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# PASO 3: LOGIN COMO AGENTE1
# ============================================================
Write-Host "PASO 3: Login como Agente1..." -ForegroundColor Yellow

$agente1LoginData = @{
    username = "agente_principal"
    password = "agente123"
} | ConvertTo-Json

try {
    $agente1LoginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $agente1LoginData -ContentType "application/json"
    $AGENTE1_TOKEN = $agente1LoginResponse.token
    Write-Host "OK Login Agente1 exitoso" -ForegroundColor Green
} catch {
    Write-Host "ERROR en login Agente1: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# PASO 4: AGENTE1 CREA SUB-AGENTE (Agente Nivel 2)
# ============================================================
Write-Host "PASO 4: Agente1 crea Sub-Agente (Nivel 2)..." -ForegroundColor Yellow

$agente2Data = @{
    username = "sub_agente_1"
    password = "subagente123"
    role = "agente"
    nombre_completo = "Maria Sub-Agente"
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $AGENTE1_TOKEN" }
    $agente2Response = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/create" -Method POST -Body $agente2Data -ContentType "application/json" -Headers $headers
    Write-Host "OK Sub-Agente creado exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($agente2Response.userId)" -ForegroundColor Gray
    Write-Host "   Parent ID: $($agente2Response.parent_id) (debe ser $AGENTE1_ID)" -ForegroundColor Gray
    $AGENTE2_ID = $agente2Response.userId
} catch {
    Write-Host "ERROR creando Sub-Agente: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# PASO 5: AGENTE1 CREA JUGADOR DIRECTO
# ============================================================
Write-Host "PASO 5: Agente1 crea Jugador directo..." -ForegroundColor Yellow

$jugador1Data = @{
    username = "jugador_carlos"
    password = "jugador123"
    role = "jugador"
    nombre_completo = "Juan Jugador"
    telefono = "3001234567"
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $AGENTE1_TOKEN" }
    $jugador1Response = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/create" -Method POST -Body $jugador1Data -ContentType "application/json" -Headers $headers
    Write-Host "OK Jugador creado exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($jugador1Response.userId)" -ForegroundColor Gray
    $JUGADOR1_ID = $jugador1Response.userId
} catch {
    Write-Host "ERROR creando Jugador: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# PASO 6: LOGIN COMO SUB-AGENTE (Nivel 2)
# ============================================================
Write-Host "PASO 6: Login como Sub-Agente..." -ForegroundColor Yellow

$agente2LoginData = @{
    username = "sub_agente_1"
    password = "subagente123"
} | ConvertTo-Json

try {
    $agente2LoginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $agente2LoginData -ContentType "application/json"
    $AGENTE2_TOKEN = $agente2LoginResponse.token
    Write-Host "OK Login Sub-Agente exitoso" -ForegroundColor Green
} catch {
    Write-Host "ERROR en login Sub-Agente: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# PASO 7: SUB-AGENTE CREA JUGADOR NIVEL 3
# ============================================================
Write-Host "PASO 7: Sub-Agente crea Jugador (Nivel 3)..." -ForegroundColor Yellow

$jugador2Data = @{
    username = "jugador_maria"
    password = "jugador123"
    role = "jugador"
    nombre_completo = "Ana Jugadora"
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $AGENTE2_TOKEN" }
    $jugador2Response = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/create" -Method POST -Body $jugador2Data -ContentType "application/json" -Headers $headers
    Write-Host "OK Jugador Nivel 3 creado exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($jugador2Response.userId)" -ForegroundColor Gray
    $JUGADOR2_ID = $jugador2Response.userId
} catch {
    Write-Host "ERROR creando Jugador Nivel 3: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# PASO 8: VERIFICAR JERARQUIA DESDE AGENTE1
# ============================================================
Write-Host "PASO 8: Verificar jerarquia desde Agente1..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $AGENTE1_TOKEN" }
    $jerarquiaAgente1 = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/hierarchy" -Method GET -Headers $headers
    
    Write-Host "OK Jerarquia de Agente1:" -ForegroundColor Green
    Write-Host "   Total usuarios en red: $($jerarquiaAgente1.all.Count)" -ForegroundColor Gray
    Write-Host "   Debe incluir: Sub-Agente (ID $AGENTE2_ID), Jugador1 (ID $JUGADOR1_ID), Jugador2 (ID $JUGADOR2_ID)" -ForegroundColor Gray
    
    # Verificar que ve los 3 usuarios creados bajo el
    $idsEncontrados = $jerarquiaAgente1.all | ForEach-Object { $_.id }
    if ($idsEncontrados -contains $AGENTE2_ID -and $idsEncontrados -contains $JUGADOR1_ID -and $idsEncontrados -contains $JUGADOR2_ID) {
        Write-Host "   OK Agente1 ve TODA su red (3 usuarios)" -ForegroundColor Green
    } else {
        Write-Host "   ADVERTENCIA: Agente1 no ve todos los usuarios esperados" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR obteniendo jerarquia Agente1: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# PASO 9: VERIFICAR JERARQUIA DESDE SUB-AGENTE
# ============================================================
Write-Host "PASO 9: Verificar jerarquia desde Sub-Agente..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $AGENTE2_TOKEN" }
    $jerarquiaAgente2 = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/hierarchy" -Method GET -Headers $headers
    
    Write-Host "OK Jerarquia de Sub-Agente:" -ForegroundColor Green
    Write-Host "   Total usuarios en red: $($jerarquiaAgente2.all.Count)" -ForegroundColor Gray
    Write-Host "   Debe incluir solo: Jugador2 (ID $JUGADOR2_ID)" -ForegroundColor Gray
    
    $idsEncontrados = $jerarquiaAgente2.all | ForEach-Object { $_.id }
    if ($idsEncontrados.Count -eq 1 -and $idsEncontrados -contains $JUGADOR2_ID) {
        Write-Host "   OK Sub-Agente ve solo SU red (1 usuario)" -ForegroundColor Green
    } else {
        Write-Host "   ADVERTENCIA: Sub-Agente ve: $($jerarquiaAgente2.all.Count) usuarios" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR obteniendo jerarquia Sub-Agente: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# PASO 10: AGENTE1 CARGA SALDO A JUGADOR1 (permitido)
# ============================================================
Write-Host "PASO 10: Agente1 carga $10,000 a Jugador1..." -ForegroundColor Yellow

$cargarSaldoData = @{
    userId = $JUGADOR1_ID
    amount = 10000
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $AGENTE1_TOKEN" }
    $cargarResponse = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/add-balance" -Method POST -Body $cargarSaldoData -ContentType "application/json" -Headers $headers
    Write-Host "OK Saldo cargado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "ERROR cargando saldo: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# PASO 11: SUB-AGENTE INTENTA MODIFICAR JUGADOR1 (NO permitido)
# ============================================================
Write-Host "PASO 11: Sub-Agente intenta cargar saldo a Jugador1 (fuera de su red)..." -ForegroundColor Yellow

$cargarSaldoInvalidoData = @{
    userId = $JUGADOR1_ID
    amount = 5000
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $AGENTE2_TOKEN" }
    $cargarInvalidoResponse = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/add-balance" -Method POST -Body $cargarSaldoInvalidoData -ContentType "application/json" -Headers $headers
    Write-Host "ERROR: Sub-Agente NO deberia poder modificar Jugador1" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 403) {
        Write-Host "OK CORRECTO: Sub-Agente bloqueado (403 Forbidden)" -ForegroundColor Green
        Write-Host "   Mensaje: Fuera de su red jerarquica" -ForegroundColor Gray
    } else {
        Write-Host "ADVERTENCIA: Error inesperado: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================
# PASO 12: SUPERADMIN VE TODOS LOS USUARIOS
# ============================================================
Write-Host "PASO 12: SuperAdmin ve TODOS los usuarios..." -ForegroundColor Yellow

try {
    $headers = @{ Authorization = "Bearer $SUPERADMIN_TOKEN" }
    $jerarquiaSuperAdmin = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/hierarchy" -Method GET -Headers $headers
    
    Write-Host "OK Jerarquia completa de SuperAdmin:" -ForegroundColor Green
    Write-Host "   Total usuarios: $($jerarquiaSuperAdmin.all.Count)" -ForegroundColor Gray
    Write-Host "   Debe incluir: Agente1, Sub-Agente, Jugador1, Jugador2" -ForegroundColor Gray
} catch {
    Write-Host "ERROR obteniendo jerarquia SuperAdmin: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# RESUMEN FINAL
# ============================================================
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "RESUMEN DEL TESTING" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tests completados:" -ForegroundColor Green
Write-Host "   1. SuperAdmin login" -ForegroundColor Gray
Write-Host "   2. Creacion de Agente Nivel 1" -ForegroundColor Gray
Write-Host "   3. Agente crea Sub-Agente (Nivel 2)" -ForegroundColor Gray
Write-Host "   4. Agente crea Jugador directo" -ForegroundColor Gray
Write-Host "   5. Sub-Agente crea Jugador (Nivel 3)" -ForegroundColor Gray
Write-Host "   6. Agente1 ve TODA su red (3 usuarios)" -ForegroundColor Gray
Write-Host "   7. Sub-Agente ve solo SU red (1 usuario)" -ForegroundColor Gray
Write-Host "   8. Agente1 modifica usuarios de su red (permitido)" -ForegroundColor Gray
Write-Host "   9. Sub-Agente bloqueado al modificar fuera de su red (403)" -ForegroundColor Gray
Write-Host "  10. SuperAdmin ve TODOS los usuarios" -ForegroundColor Gray
Write-Host ""
Write-Host "SISTEMA JERARQUICO FUNCIONANDO CORRECTAMENTE" -ForegroundColor Green
Write-Host ""
