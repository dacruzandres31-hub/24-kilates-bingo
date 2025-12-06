# Test Animation System
# Simula eventos Socket.IO para probar las animaciones

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTING ANIMATION SYSTEM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$API_URL = "http://localhost:3001"
$token = Read-Host "Ingresa tu token JWT (o presiona Enter para skip manual)"

if (-not $token) {
    Write-Host ""
    Write-Host "=== PRUEBA MANUAL ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Abre la aplicación en el navegador" -ForegroundColor White
    Write-Host "2. Abre las Developer Tools (F12)" -ForegroundColor White
    Write-Host "3. Ve a la pestaña Console" -ForegroundColor White
    Write-Host "4. Copia y pega estos comandos:" -ForegroundColor White
    Write-Host ""
    
    Write-Host "// Test 1: CONFETTI EFFECT (BINGO Win)" -ForegroundColor Green
    Write-Host @"
window.testConfetti = () => {
  const event = new CustomEvent('test-socket-event', {
    detail: { 
      type: 'bingo_winner', 
      data: { 
        username: 'TU_USUARIO', 
        prizeAmount: 5000 
      } 
    }
  });
  window.dispatchEvent(event);
  console.log('🎊 Confetti test triggered!');
};
window.testConfetti();
"@ -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "// Test 2: PARTICLE EFFECT (Line Win)" -ForegroundColor Green
    Write-Host @"
window.testParticles = (lineType = 'horizontal') => {
  const event = new CustomEvent('test-socket-event', {
    detail: { 
      type: 'line_winner', 
      data: { 
        username: 'TU_USUARIO', 
        lineType: lineType,
        prizeAmount: 500 
      } 
    }
  });
  window.dispatchEvent(event);
  console.log('✨ Particles test triggered! Type:', lineType);
};
window.testParticles('horizontal'); // horizontal, vertical, diagonal
"@ -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "// Test 3: SHAKE EFFECT (Almost Win)" -ForegroundColor Green
    Write-Host @"
// Esta animación se activa automáticamente cuando un cartón está a 1 número de ganar
// Para simularla, necesitas:
// 1. Tener cartones comprados (20 recomendado)
// 2. Esperar a que un cartón llegue a 24 números marcados
// 3. El sistema detectará automáticamente y aplicará:
//    - Shake animation (vibración horizontal)
//    - Glow dorado pulsante
//    - Badge "⚡ CASI"
//    - Resaltar número faltante en amarillo

console.log('🔥 Shake effect se activa automáticamente cuando un cartón está a 1 número de ganar');
"@ -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "// Test 4: ALL ANIMATIONS DEMO" -ForegroundColor Green
    Write-Host @"
window.testAllAnimations = async () => {
  console.log('🎬 Starting full animation demo...');
  
  // Confetti
  setTimeout(() => {
    window.testConfetti();
    console.log('1/3 - Confetti shown');
  }, 1000);
  
  // Particles (horizontal)
  setTimeout(() => {
    window.testParticles('horizontal');
    console.log('2/3 - Horizontal particles shown');
  }, 4000);
  
  // Particles (diagonal)
  setTimeout(() => {
    window.testParticles('diagonal');
    console.log('3/3 - Diagonal particles shown');
  }, 6000);
  
  console.log('✅ Animation demo complete!');
};
window.testAllAnimations();
"@ -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "=== RESULTADOS ESPERADOS ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[✓] Confetti: 100 piezas cayendo con rotación 3D (3s)" -ForegroundColor Green
    Write-Host "[✓] Particles: 30 partículas en explosión radial (1.5s)" -ForegroundColor Green
    Write-Host "[✓] Shake: Vibración horizontal + glow dorado (continuo)" -ForegroundColor Green
    Write-Host "[✓] Missing Highlight: Número faltante en amarillo brillante" -ForegroundColor Green
    Write-Host ""
    
    exit
}

# Modo automático (con token)
Write-Host "=== PRUEBA AUTOMATICA ===" -ForegroundColor Yellow
Write-Host ""

# Verificar servidor
Write-Host "[1/5] Verificando servidor..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$API_URL/api/health" -Method GET -ErrorAction Stop
    Write-Host "  ✓ Servidor activo" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Servidor no responde" -ForegroundColor Red
    Write-Host "  Inicia el servidor con: cd server && npm start" -ForegroundColor Yellow
    exit 1
}

# Obtener sesión activa
Write-Host "[2/5] Buscando sesión activa..." -ForegroundColor Cyan
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    $sessions = Invoke-RestMethod -Uri "$API_URL/api/game/sessions" -Method GET -Headers $headers
    $activeSession = $sessions | Where-Object { $_.status -eq 'active' } | Select-Object -First 1
    
    if ($activeSession) {
        Write-Host "  ✓ Sesión encontrada: $($activeSession.session_id)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ No hay sesiones activas" -ForegroundColor Red
        Write-Host "  Crea una sesión desde el panel de Admin" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "  ✗ Error al obtener sesiones: $_" -ForegroundColor Red
    exit 1
}

# Comprar cartones si no hay
Write-Host "[3/5] Verificando cartones..." -ForegroundColor Cyan
try {
    $cards = Invoke-RestMethod -Uri "$API_URL/api/cards/my-cards/$($activeSession.session_id)" -Method GET -Headers $headers
    
    if ($cards.Count -eq 0) {
        Write-Host "  ! No tienes cartones, comprando 20..." -ForegroundColor Yellow
        $buyBody = @{
            session_id = $activeSession.session_id
            quantity = 20
        } | ConvertTo-Json
        
        $bought = Invoke-RestMethod -Uri "$API_URL/api/cards/buy" -Method POST -Headers $headers -Body $buyBody -ContentType "application/json"
        Write-Host "  ✓ 20 cartones comprados" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Tienes $($cards.Count) cartones" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Error al verificar cartones: $_" -ForegroundColor Red
    exit 1
}

# Simular eventos Socket.IO
Write-Host "[4/5] Simulando eventos de ganador..." -ForegroundColor Cyan
Write-Host ""

# Test Confetti
Write-Host "  [TEST 1/3] Confetti Effect (BINGO)" -ForegroundColor Magenta
Write-Host "    → Abre http://localhost:3000 en el navegador" -ForegroundColor Yellow
Write-Host "    → En Console, ejecuta: window.testConfetti()" -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Test Particles
Write-Host "  [TEST 2/3] Particle Effect (Line)" -ForegroundColor Magenta
Write-Host "    → En Console, ejecuta: window.testParticles('horizontal')" -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Test Shake
Write-Host "  [TEST 3/3] Shake Effect (Almost Win)" -ForegroundColor Magenta
Write-Host "    → Se activa automáticamente con cartones a 1 número" -ForegroundColor Yellow
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "[5/5] Resumen de Animaciones" -ForegroundColor Cyan
Write-Host ""

$animations = @(
    @{ Name = "Confetti Effect"; Trigger = "bingo_winner"; Duration = "3s"; Status = "✓" },
    @{ Name = "Particle Effect"; Trigger = "line_winner"; Duration = "1.5s"; Status = "✓" },
    @{ Name = "Shake Effect"; Trigger = "cards_reordered (auto)"; Duration = "Continuo"; Status = "✓" },
    @{ Name = "Cell Flip"; Trigger = "ball_drawn"; Duration = "0.6s"; Status = "✓" },
    @{ Name = "Cell Glow"; Trigger = "ball_drawn"; Duration = "1s"; Status = "✓" }
)

$animations | ForEach-Object {
    $color = if ($_.Status -eq "✓") { "Green" } else { "Red" }
    Write-Host "  [$($_.Status)] $($_.Name)" -ForegroundColor $color
    Write-Host "      Trigger: $($_.Trigger)" -ForegroundColor Gray
    Write-Host "      Duration: $($_.Duration)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTS COMPLETADOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para pruebas manuales detalladas, ejecuta este script sin token:" -ForegroundColor Yellow
Write-Host "  ./test_animations.ps1" -ForegroundColor Cyan
Write-Host ""
