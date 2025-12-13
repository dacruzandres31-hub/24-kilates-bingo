$BASE_URL = "http://localhost:3001"

Write-Host "`n" -NoNewline
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "       ARBOL JERARQUICO DE USUARIOS          " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Función para obtener usuarios recursivamente
function Get-UserTree {
    param(
        [int]$ParentId = $null,
        [int]$Level = 0,
        [string]$Token
    )
    
    $headers = @{ "Authorization" = "Bearer $Token" }
    
    # Obtener todos los usuarios
    try {
        $allUsers = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users" -Method Get -Headers $headers
        
        # Filtrar por parent_id
        if ($null -eq $ParentId) {
            $users = $allUsers.users | Where-Object { $null -eq $_.parent_id }
        } else {
            $users = $allUsers.users | Where-Object { $_.parent_id -eq $ParentId }
        }
        
        foreach ($user in $users) {
            # Crear indentación
            $indent = "  " * $Level
            
            # Símbolos según nivel
            if ($Level -eq 0) {
                $symbol = "[ROOT]"
            } elseif ($Level -eq 1) {
                $symbol = "  |->"
            } else {
                $symbol = "    |->"
            }
            
            # Colores según rol
            $color = switch ($user.role) {
                "superadmin" { "Magenta" }
                "agente" { "Green" }
                "jugador" { "Yellow" }
                default { "White" }
            }
            
            # Mostrar usuario
            Write-Host "$indent$symbol " -NoNewline
            Write-Host "$($user.username)" -ForegroundColor $color -NoNewline
            Write-Host " [$($user.role)] " -ForegroundColor Gray -NoNewline
            Write-Host "(ID: $($user.id))" -ForegroundColor DarkGray
            
            # Recursión para hijos
            Get-UserTree -ParentId $user.id -Level ($Level + 1) -Token $Token
        }
    } catch {
        Write-Host "Error obteniendo usuarios: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Login como admin para obtener token
try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $response.token
    
    Write-Host "Mostrando estructura completa...`n" -ForegroundColor Cyan
    
    # Mostrar árbol
    Get-UserTree -ParentId $null -Level 0 -Token $token
    
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "Leyenda:" -ForegroundColor White
    Write-Host "  [ROOT] = Nivel raiz (SuperAdmins y Agentes sin parent)" -ForegroundColor DarkGray
    Write-Host "  |-> = Usuarios bajo un agente" -ForegroundColor DarkGray
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Asegurate de que el servidor este corriendo en puerto 3001" -ForegroundColor Yellow
}
