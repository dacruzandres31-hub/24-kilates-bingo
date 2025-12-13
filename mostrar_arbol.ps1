Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "       ARBOL JERARQUICO DE USUARIOS          " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Consulta SQL que genera el árbol
$query = @"
WITH RECURSIVE user_tree AS (
  SELECT 
    id, 
    username, 
    role, 
    parent_id, 
    0 as level,
    CAST(username AS CHAR(1000)) as path
  FROM users 
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT 
    u.id, 
    u.username, 
    u.role, 
    u.parent_id, 
    ut.level + 1,
    CONCAT(ut.path, ' -> ', u.username)
  FROM users u
  INNER JOIN user_tree ut ON u.parent_id = ut.id
)
SELECT 
  level,
  CONCAT(REPEAT('  ', level), username) as user_hierarchy,
  role,
  id,
  parent_id
FROM user_tree 
ORDER BY path;
"@

# Ejecutar consulta
try {
    $result = & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pbingo2024 bingo_24k -e $query 2>$null
    
    # Procesar y mostrar con colores
    $lines = $result -split "`n"
    $inData = $false
    
    foreach ($line in $lines) {
        if ($line -match "^\+") {
            # Líneas separadoras
            continue
        }
        
        if ($line -match "^\\| level") {
            # Header
            $inData = $true
            continue
        }
        
        if ($inData -and $line -match "^\|") {
            # Parsear línea de datos
            $parts = $line -split "\|" | ForEach-Object { $_.Trim() }
            if ($parts.Count -ge 4) {
                $level = $parts[1]
                $userHierarchy = $parts[2]
                $role = $parts[3]
                $id = $parts[4]
                $parentId = if ($parts.Count -ge 6) { $parts[5] } else { "NULL" }
                
                # Colorear según rol
                $color = switch ($role) {
                    "superadmin" { "Magenta" }
                    "agente" { "Green" }
                    "jugador" { "Yellow" }
                    default { "White" }
                }
                
                # Mostrar
                Write-Host $userHierarchy -ForegroundColor $color -NoNewline
                Write-Host " [$role]" -ForegroundColor Gray -NoNewline
                Write-Host " (ID: $id" -ForegroundColor DarkGray -NoNewline
                if ($parentId -ne "NULL") {
                    Write-Host ", parent: $parentId" -ForegroundColor DarkGray -NoNewline
                }
                Write-Host ")" -ForegroundColor DarkGray
            }
        }
    }
    
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "Colores:" -ForegroundColor White
    Write-Host "  " -NoNewline
    Write-Host "SUPERADMIN" -ForegroundColor Magenta -NoNewline
    Write-Host " | " -NoNewline
    Write-Host "AGENTE" -ForegroundColor Green -NoNewline
    Write-Host " | " -NoNewline
    Write-Host "JUGADOR" -ForegroundColor Yellow
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
