-- Resumen completo de la base de datos de producción
SELECT 'TABLAS' as tipo, COUNT(*) as cantidad FROM information_schema.tables WHERE table_schema='bingo_24k' AND table_type='BASE TABLE'
UNION ALL
SELECT 'VISTAS', COUNT(*) FROM information_schema.tables WHERE table_schema='bingo_24k' AND table_type='VIEW'
UNION ALL
SELECT 'USUARIOS', COUNT(*) FROM users
UNION ALL
SELECT 'SUPERADMINS', COUNT(*) FROM users WHERE role='superadmin'
UNION ALL
SELECT 'AGENTES', COUNT(*) FROM users WHERE role='agente'
UNION ALL
SELECT 'CARTONES_DISPONIBLES', COUNT(*) FROM bingo_cards_pool WHERE status='available'
UNION ALL
SELECT 'HORARIOS_SALA', COUNT(*) FROM schedule_settings
UNION ALL
SELECT 'ITEMS_COSMETICOS', COUNT(*) FROM cosmetic_items
UNION ALL
SELECT 'NIVELES_GAMIFICACION', COUNT(*) FROM gamification_levels;

SELECT '=== DETALLE SALAS ===' as info;
SELECT room, card_price, percentage_linea as linea_pct, percentage_bingo as bingo_pct, percentage_acumulado as acumulado_pct FROM room_settings;

SELECT '=== DETALLE CARTONES POR SALA ===' as info;
SELECT room, COUNT(*) as disponibles FROM bingo_cards_pool WHERE status='available' GROUP BY room;

SELECT '=== SUPERADMIN ===' as info;
SELECT id, username, role, balance, can_process_payouts, xp, nivel FROM users WHERE role='superadmin';
