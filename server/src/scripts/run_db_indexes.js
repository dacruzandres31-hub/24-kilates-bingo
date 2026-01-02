const pool = require('../db');

async function applyIndexes() {
    const statements = [
        "ALTER TABLE chips_movements ADD INDEX IF NOT EXISTS idx_chips_user_date (user_id, created_at)",
        "ALTER TABLE chips_movements ADD INDEX IF NOT EXISTS idx_chips_created_at (created_at)",
        "ALTER TABLE user_card_inventory ADD INDEX IF NOT EXISTS idx_uci_user_room (user_id, room)",
        "ALTER TABLE game_session_balls ADD INDEX IF NOT EXISTS idx_gsb_session_order (game_session_id, draw_order)",
        "ALTER TABLE winners_payment_info ADD INDEX IF NOT EXISTS idx_wpi_status (status)",
        "ALTER TABLE card_movements_log ADD INDEX IF NOT EXISTS idx_cml_created (created_at)"
    ];

    /*
    ## 🏗️ Fase 6: Arquitectura y Escalabilidad (Roadmap Punto 1)
    - [x] Configurar Redis Connection (`redis.js`) <!-- id: 101 -->
    - [x] Optimizar Pool de Conexiones MySQL (`db.js`) <!-- id: 102 -->
    - [x] Crear Índices de Base de Datos para Dashboards (`add_db_indexes.sql`) <!-- id: 103 -->
    - [x] Refactorizar `GameEngineAuto.js` para usar Redis Store <!-- id: 104 -->
        - [x] Implementar `saveGameState` en Redis <!-- id: 105 -->
        - [x] Implementar `getGameState` / `loadGameState` <!-- id: 106 -->
        - [x] Actualizar métodos de sorteo para flujo asíncrono con Redis <!-- id: 107 -->
    */

    console.log(`🚀 Iniciando aplicación de ${statements.length} índices...`);

    for (let statement of statements) {
        try {
            // Intentar primero con IF NOT EXISTS, si falla por versión, quitarlo
            try {
                await pool.query(statement);
                console.log(`✅ Ejecutado: ${statement.substring(0, 60)}...`);
            } catch (innerError) {
                if (innerError.code === 'ER_PARSE_ERROR' || innerError.code === 'ER_SYNTAX_ERROR') {
                    const fallback = statement.replace('IF NOT EXISTS ', '');
                    await pool.query(fallback);
                    console.log(`✅ Ejecutado (Fallback): ${fallback.substring(0, 60)}...`);
                } else if (innerError.code === 'ER_DUP_KEYNAME') {
                    console.log(`ℹ️ Índice ya existe: ${statement.split(' ').pop()}`);
                } else {
                    throw innerError;
                }
            }
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log(`ℹ️ Índice ya existe.`);
            } else {
                console.error(`❌ Error en: ${statement.substring(0, 50)}...`);
                console.error(`   Detalle: ${error.message}`);
            }
        }
    }

    console.log('🏁 Proceso de indexación finalizado.');
    process.exit(0);
}

applyIndexes();
