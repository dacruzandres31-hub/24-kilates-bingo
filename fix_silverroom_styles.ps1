$filePath = "c:\Users\User\Documents\24 kilates\client-player\src\components\SilverRoom.jsx"
$content = Get-Content $filePath -Raw

# Eliminar style con color y textShadow
$content = $content -replace '\s*style=\{\{\s*\n\s*color:\s*getBallColor\(start\),\s*\n\s*textShadow:\s*`0 0 20px \$\{getBallColor\(start\)\}`\s*\n\s*\}\}', ''

# Eliminar style con backgroundColor y boxShadow
$content = $content -replace '\s*style=\{isCalled \? \{\s*\n\s*backgroundColor:\s*getBallColor\(number\),\s*\n\s*boxShadow:\s*`0 0 20px \$\{getBallColor\(number\)\}`\s*\n\s*\} : \{\}\}', ''

# Eliminar style con borderColor
$content = $content -replace '\s*style=\{\{\s*borderColor:\s*getBallColor\(number\)\s*\}\}', ''

# Eliminar data-range ya que no lo usamos
$content = $content -replace '\s*data-range=\{getNumberRange\(number\)\}', ''

Set-Content $filePath $content -NoNewline
Write-Host "Estilos inline eliminados exitosamente"
