#!/bin/bash

# ===== SALA STARTER - VERIFICATION SCRIPT =====
# Script para verificar que todos los componentes están instalados correctamente

echo "🔍 SALA STARTER - Verification Script"
echo "===================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASS=0
FAIL=0

# Función para chequear archivos
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $1 (NOT FOUND)"
    ((FAIL++))
  fi
}

# Función para chequear carpetas
check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $1/"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $1/ (NOT FOUND)"
    ((FAIL++))
  fi
}

echo "📁 Checking Backend Files..."
check_file "server/schema.sql"
check_file "server/cosmetics_seed.sql"
check_file "server/src/services/inventoryService.js"
check_file "server/src/controllers/inventoryController.js"
check_file "server/src/routes/inventoryRoutes.js"
check_file "server/src/services/scheduler.js"
echo ""

echo "🎨 Checking Frontend Files..."
check_file "client-player/src/pages/InventoryScreen.jsx"
check_file "client-player/src/pages/LobbyPage.jsx"
check_file "client-player/src/components/BingoCard.jsx"
check_file "client-player/src/styles/InventoryScreen.css"
check_file "client-player/src/styles/LobbyPage.css"
check_file "client-player/src/styles/BingoCard.css"
echo ""

echo "📚 Checking Documentation..."
check_file "SALA_STARTER_DOCUMENTATION.md"
check_file "SALA_STARTER_QUICKSTART.md"
check_file "CHANGELOG_v1.2.0.md"
check_file "SALA_STARTER_STATUS_BOARD.txt"
echo ""

echo "🔧 Checking Main Application Files..."
check_file "server/src/index.js"
check_file "server/src/controllers/gameController.js"
check_file "server/src/routes/gameRoutes.js"
check_file "package.json"
echo ""

# Verificar contenido clave en archivos
echo "🔎 Checking Key Content..."
echo ""

# Buscar en schema.sql
if grep -q "cosmetic_items" server/schema.sql 2>/dev/null; then
  echo -e "${GREEN}✓${NC} schema.sql contiene tabla 'cosmetic_items'"
  ((PASS++))
else
  echo -e "${RED}✗${NC} schema.sql NO tiene tabla 'cosmetic_items'"
  ((FAIL++))
fi

# Buscar en inventoryService
if grep -q "dropRandomItem" server/src/services/inventoryService.js 2>/dev/null; then
  echo -e "${GREEN}✓${NC} inventoryService.js contiene función 'dropRandomItem'"
  ((PASS++))
else
  echo -e "${RED}✗${NC} inventoryService.js NO tiene 'dropRandomItem'"
  ((FAIL++))
fi

# Buscar en scheduler
if grep -q "createStarterSession" server/src/services/scheduler.js 2>/dev/null; then
  echo -e "${GREEN}✓${NC} scheduler.js contiene función 'createStarterSession'"
  ((PASS++))
else
  echo -e "${RED}✗${NC} scheduler.js NO tiene 'createStarterSession'"
  ((FAIL++))
fi

# Buscar en gameController
if grep -q "buyCardFree" server/src/controllers/gameController.js 2>/dev/null; then
  echo -e "${GREEN}✓${NC} gameController.js contiene función 'buyCardFree'"
  ((PASS++))
else
  echo -e "${RED}✗${NC} gameController.js NO tiene 'buyCardFree'"
  ((FAIL++))
fi

# Buscar en LobbyPage
if grep -q "SALA STARTER" client-player/src/pages/LobbyPage.jsx 2>/dev/null; then
  echo -e "${GREEN}✓${NC} LobbyPage.jsx contiene 'SALA STARTER'"
  ((PASS++))
else
  echo -e "${RED}✗${NC} LobbyPage.jsx NO tiene 'SALA STARTER'"
  ((FAIL++))
fi

# Buscar en BingoCard
if grep -q "equippedSkin" client-player/src/components/BingoCard.jsx 2>/dev/null; then
  echo -e "${GREEN}✓${NC} BingoCard.jsx soporta 'equippedSkin'"
  ((PASS++))
else
  echo -e "${RED}✗${NC} BingoCard.jsx NO soporta 'equippedSkin'"
  ((FAIL++))
fi

echo ""
echo "===================================="
echo "📊 Verification Summary"
echo "===================================="
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED - Ready to deploy!${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME CHECKS FAILED - Please review${NC}"
  exit 1
fi
