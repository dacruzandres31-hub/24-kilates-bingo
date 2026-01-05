#!/bin/bash
# Script para aplicar migraciones faltantes a producción
# Ejecutar como: bash /tmp/apply_migrations.sh

cd /var/www/bingo24k/server
MYSQL="mysql -u root -psistemas bingo_24k"

echo "=== APLICANDO MIGRACIONES FALTANTES ==="

# 1. Schedule settings
echo "[1/15] Schedule settings..."
$MYSQL < SCHEDULE_MIGRATION.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 2. Starter room config
echo "[2/15] Starter room config..."
$MYSQL < STARTER_CONFIG_MIGRATION.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 3. User block migration
echo "[3/15] User block..."
$MYSQL < USER_BLOCK_MIGRATION_COMPATIBLE.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 4. Winner payment info
echo "[4/15] Winner payment info..."
$MYSQL < CREATE_WINNER_PAYMENT_INFO.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 5. Game winners
echo "[5/15] Game winners..."
$MYSQL < GAME_WINNERS_MIGRATION.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 6. Gift cards
echo "[6/15] Gift cards..."
$MYSQL < GIFT_CARDS_MYSQL_SAFE.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 7. Global card counter
echo "[7/15] Global card counter..."
$MYSQL < GLOBAL_CARD_COUNTER_MIGRATION.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 8. Agent banking
echo "[8/15] Agent banking..."
$MYSQL < ADD_AGENT_BANKING.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 9. Payment system
echo "[9/15] Payment system..."
$MYSQL < ADD_PAYMENT_SYSTEM.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 10. Whatsapp configs
echo "[10/15] Whatsapp configs..."
$MYSQL < ADD_WHATSAPP_CONFIGS.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 11. Historial sesiones
echo "[11/15] Session history..."
$MYSQL < HISTORIAL_SESIONES_MIGRATION.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 12. Audit logs
echo "[12/15] Audit logs..."
$MYSQL < create_audit_logs_table.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 13. User cards table
echo "[13/15] User cards..."
$MYSQL < USER_CARDS_TABLE.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 14. Membership tables
echo "[14/15] Memberships..."
$MYSQL < create_membership_tables.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

# 15. Deposit requests
echo "[15/15] Deposit requests..."
$MYSQL < UPDATE_DEPOSIT_DETAILS.sql 2>&1 | grep -v "Warning\|already exists\|Duplicate"

echo ""
echo "=== VERIFICANDO DATOS INICIALES ==="

# Verificar room_settings tiene datos
ROOM_COUNT=$($MYSQL -N -e "SELECT COUNT(*) FROM room_settings" 2>/dev/null)
if [ "$ROOM_COUNT" = "0" ] || [ -z "$ROOM_COUNT" ]; then
    echo "Insertando configuración de salas..."
    $MYSQL -e "
    INSERT INTO room_settings (room, card_price, pot_linea_percent, pot_bingo_percent, pot_jackpot_percent, admin_percent, accumulated_pre40, is_active) VALUES
    ('bronce', 500, 30, 50, 10, 10, 0, 1),
    ('plata', 2500, 30, 50, 10, 10, 0, 1),
    ('oro', 10000, 30, 50, 10, 10, 0, 1),
    ('starter', 0, 0, 100, 0, 0, 0, 1)
    ON DUPLICATE KEY UPDATE card_price=VALUES(card_price);
    "
fi

# Verificar starter_room_config
STARTER_COUNT=$($MYSQL -N -e "SELECT COUNT(*) FROM starter_room_config" 2>/dev/null)
if [ "$STARTER_COUNT" = "0" ] || [ -z "$STARTER_COUNT" ]; then
    echo "Insertando configuración starter..."
    $MYSQL -e "
    INSERT INTO starter_room_config (id, fixed_prize, schedule_time, is_active, last_run) VALUES
    (1, 10000, '19:00:00', 1, NULL)
    ON DUPLICATE KEY UPDATE fixed_prize=VALUES(fixed_prize);
    " 2>/dev/null
fi

# Verificar schedule_settings
SCHEDULE_COUNT=$($MYSQL -N -e "SELECT COUNT(*) FROM schedule_settings" 2>/dev/null)
if [ "$SCHEDULE_COUNT" = "0" ] || [ -z "$SCHEDULE_COUNT" ]; then
    echo "Insertando horarios de salas..."
    $MYSQL -e "
    INSERT INTO schedule_settings (room, schedule_time, is_active) VALUES
    ('bronce', '20:00:00', 1),
    ('bronce', '21:00:00', 1),
    ('bronce', '22:00:00', 1),
    ('plata', '20:30:00', 1),
    ('plata', '21:30:00', 1),
    ('oro', '22:30:00', 1)
    ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);
    " 2>/dev/null
fi

echo ""
echo "=== RESUMEN FINAL ==="
$MYSQL -e "SELECT 'room_settings' as tabla, COUNT(*) as registros FROM room_settings
UNION ALL SELECT 'schedule_settings', COUNT(*) FROM schedule_settings
UNION ALL SELECT 'starter_room_config', COUNT(*) FROM starter_room_config
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'cosmetic_items', COUNT(*) FROM cosmetic_items;" 2>/dev/null

echo ""
echo "=== MIGRACIONES COMPLETADAS ==="
