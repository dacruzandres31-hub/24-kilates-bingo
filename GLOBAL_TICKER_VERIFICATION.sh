#!/bin/bash
# GLOBAL_TICKER_VERIFICATION.sh - Verificación rápida de implementación

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DEL GLOBAL TICKER..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✅${NC} $1 EXISTE"
    return 0
  else
    echo -e "${RED}❌${NC} $1 NO ENCONTRADO"
    return 1
  fi
}

check_content() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} $1 contiene: '$2'"
    return 0
  else
    echo -e "${RED}❌${NC} $1 NO contiene: '$2'"
    return 1
  fi
}

echo "=== ARCHIVOS NUEVOS ==="
echo ""
check_file "server/src/services/notificationService.js"
check_file "client-player/src/components/GlobalTicker.jsx"
check_file "client-player/src/components/CelebrationModal.jsx"
check_file "GLOBAL_TICKER.md"
check_file "GLOBAL_TICKER_IMPLEMENTATION.md"
check_file "GLOBAL_TICKER_DELIVERY.md"

echo ""
echo "=== INTEGRACIONES BACKEND ==="
echo ""
check_content "server/src/index.js" "notificationService.initialize(io)"
check_content "server/src/controllers/gameController.js" "broadcastLevelUp"
check_content "server/src/controllers/gameController.js" "broadcastBigWin"
check_content "server/src/controllers/gamificationController.js" "broadcastAchievement"
check_content "server/src/services/ranking_engine.js" "broadcastAgentRank"

echo ""
echo "=== INTEGRACIONES FRONTEND ==="
echo ""
check_content "client-player/src/pages/GameRoom.jsx" "GlobalTicker"
check_content "client-player/src/pages/GameRoom.jsx" "CelebrationModal"
check_content "client-player/src/pages/GameRoom.jsx" "celebrationData"

echo ""
echo "=== DOCUMENTACIÓN ==="
echo ""
check_content "GLOBAL_TICKER.md" "MÓDULO EXTRA: GLOBAL TICKER"
check_content "GLOBAL_TICKER_IMPLEMENTATION.md" "IMPLEMENTACIÓN COMPLETADA"
check_content "GLOBAL_TICKER_DELIVERY.md" "ENTREGA FINAL"

echo ""
echo "✨ VERIFICACIÓN COMPLETADA"
echo ""
echo "Para testing:"
echo "1. cd server && npm start"
echo "2. cd client-player && npm run dev"
echo "3. Comprar cartón para trigger level-up"
echo "4. Verificar GlobalTicker y CelebrationModal"
