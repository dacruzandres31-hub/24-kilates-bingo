const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
  });

  console.log('✅ Conectado a MySQL');

  // Obtener IDs de tickets de cosmetic_items
  const [ticketsBronce] = await db.query(
    "SELECT id FROM cosmetic_items WHERE ticket_room = 'bronce' AND is_consumable = true LIMIT 1"
  );
  const [ticketsPlata] = await db.query(
    "SELECT id FROM cosmetic_items WHERE ticket_room = 'plata' AND is_consumable = true LIMIT 1"
  );
  const [ticketsOro] = await db.query(
    "SELECT id FROM cosmetic_items WHERE ticket_room = 'oro' AND is_consumable = true LIMIT 1"
  );

  if (ticketsBronce.length === 0 || ticketsPlata.length === 0 || ticketsOro.length === 0) {
    console.log('❌ No se encontraron tickets en cosmetic_items');
    await db.end();
    return;
  }

  const bronce_id = ticketsBronce[0].id;
  const plata_id = ticketsPlata[0].id;
  const oro_id = ticketsOro[0].id;

  console.log(`📋 IDs de tickets en cosmetic_items:`, { bronce_id, plata_id, oro_id });

  // Obtener datos de user_card_inventory
  const [cardInventory] = await db.query(
    `SELECT user_id, room, SUM(quantity) as total_quantity
     FROM user_card_inventory
     GROUP BY user_id, room`
  );

  console.log(`\n📦 Encontrados ${cardInventory.length} registros en user_card_inventory`);

  let migratedCount = 0;

  // Migrar cada registro
  for (const record of cardInventory) {
    const { user_id, room, total_quantity } = record;
    
    // Mapear room a item_id
    let item_id;
    if (room === 'bronce') item_id = bronce_id;
    else if (room === 'plata') item_id = plata_id;
    else if (room === 'oro') item_id = oro_id;
    else continue; // Saltar salas no mapeadas

    // Insertar o actualizar en user_inventory
    await db.query(
      `INSERT INTO user_inventory (user_id, item_id, quantity, equipped, obtained_at)
       VALUES (?, ?, ?, FALSE, NOW())
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [user_id, item_id, total_quantity]
    );

    console.log(`✅ Migrado: user_id=${user_id}, room=${room}, cantidad=${total_quantity}`);
    migratedCount++;
  }

  console.log(`\n✅ Migrados ${migratedCount} registros a user_inventory`);

  // Verificar tickets de Eve27
  const [eve27Tickets] = await db.query(
    `SELECT u.username, ci.name, ci.ticket_room, ui.quantity
     FROM user_inventory ui
     JOIN cosmetic_items ci ON ui.item_id = ci.id
     JOIN users u ON ui.user_id = u.id
     WHERE u.username = 'Eve27' AND ci.is_consumable = true`
  );

  console.log('\n📋 Tickets de Eve27 después de migración:');
  console.table(eve27Tickets);

  await db.end();
  console.log('\n✅ Proceso completado');
})().catch(console.error);
