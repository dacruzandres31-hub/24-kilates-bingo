const mysql = require('mysql2/promise');

async function updateMembershipBenefits() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('✅ Conectado a MySQL\n');

        // Update Bronce
        const bronzeConfig = {
            monthly_free_cards: 10,
            free_cards_room: 'gold',
            wheel_extra_spin: 'renewal',
            chat_badge: 'bronze_animated',
            pack_bingo_bonus: {
                threshold: 10,
                free_cards: 1
            }
        };

        await connection.query(
            'UPDATE memberships SET benefits_config = ? WHERE name = ?',
            [JSON.stringify(bronzeConfig), 'Socio Bronce']
        );
        console.log('✅ Bronce: Compra 10 → Paga 9, recibe 10');

        // Update Plata
        const silverConfig = {
            monthly_free_cards: 20,
            free_cards_room: 'gold',
            bonus_buy_threshold: 20,
            bonus_buy_reward: 2,
            bonus_buy_room: 'same',
            wheel_daily_spins: 1,
            chat_badge: 'silver_animated',
            pack_bingo_bonus: {
                threshold: 20,
                free_cards: 2
            }
        };

        await connection.query(
            'UPDATE memberships SET benefits_config = ? WHERE name = ?',
            [JSON.stringify(silverConfig), 'Socio Plata']
        );
        console.log('✅ Plata: Compra 20 → Paga 18, recibe 20');

        // Update Oro
        const goldConfig = {
            monthly_free_cards: 50,
            free_cards_room: 'gold',
            bonus_buy_threshold: 20,
            bonus_buy_reward: 4,
            bonus_buy_room: 'same',
            wheel_daily_spins: 2,
            chat_badge: 'gold_animated',
            pack_bingo_bonus: {
                threshold: 20,
                free_cards: 4
            }
        };

        await connection.query(
            'UPDATE memberships SET benefits_config = ? WHERE name = ?',
            [JSON.stringify(goldConfig), 'Socio Oro']
        );
        console.log('✅ Oro: Compra 20 → Paga 16, recibe 20');

        // Verify
        console.log('\n📋 Verificando actualización:');
        const [tiers] = await connection.query('SELECT name, benefits_config FROM memberships ORDER BY price');

        tiers.forEach(tier => {
            const config = JSON.parse(tier.benefits_config);
            console.log(`\n${tier.name}:`);
            if (config.pack_bingo_bonus) {
                const bonus = config.pack_bingo_bonus;
                const charged = bonus.threshold - bonus.free_cards;
                console.log(`  ✓ Compra ${bonus.threshold} → Paga ${charged}, recibe ${bonus.threshold}`);
            }
        });

        console.log('\n✨ Beneficios actualizados correctamente!');

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

updateMembershipBenefits();
