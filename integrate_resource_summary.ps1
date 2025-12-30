# Script para integrar ResourceSummary en GestionUsuarios.jsx

$filePath = "client-admin\src\components\GestionUsuarios.jsx"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Definir el reemplazo
$oldCode = @'
        <div className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            💼 Recursos Disponibles - Panel de {sharedUserData?.username || currentUser.username}
            {currentUser.role === 'superadmin' && (
              <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full font-bold ml-2">SUPERADMIN</span>
            )}
          </h2>

          {/* BOTÓN COMPRAR STOCK (Solo Agentes y Admins) */}
          {(currentUser.role === 'agente' || currentUser.role === 'admin') && (
            <button
              onClick={() => setModalMayorista({ isOpen: true, usuario: currentUser })}
              className="mb-4 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
            >
              <span className="text-xl">🛒</span>
              <span>COMPRAR STOCK (Venta Mayorista)</span>
            </button>
          )}
'@

$newCode = @'
        {/* Panel de Recursos Disponibles - Modularizado */}
        <ResourceSummary
          sharedUserData={sharedUserData}
          currentUser={currentUser}
          sharedCartonesStock={sharedCartonesStock}
          onOpenConfirmModal={(tipo) => {
            console.log('🔍 Click en +Balance, currentUser:', currentUser);
            setModalConfirmacion({
              isOpen: true,
              tipo: tipo,
              sala: '',
              cantidad: '',
              userId: currentUser.id
            });
          }}
          onOpenWholesaleModal={() => setModalMayorista({ isOpen: true, usuario: currentUser })}
          onAddCards={handleCargarCartones}
          onRemoveCards={handleCargarCartones}
        />
'@

# Intentar el reemplazo
if ($content -match [regex]::Escape($oldCode)) {
    Write-Host "✅ Patrón encontrado, realizando reemplazo..." -ForegroundColor Green
    $content = $content -replace [regex]::Escape($oldCode), $newCode
    $content | Set-Content $filePath -Encoding UTF8 -NoNewline
    Write-Host "✅ Reemplazo completado exitosamente" -ForegroundColor Green
}
else {
    Write-Host "❌ Patrón no encontrado en el archivo" -ForegroundColor Red
    Write-Host "Buscando variaciones..." -ForegroundColor Yellow
}
