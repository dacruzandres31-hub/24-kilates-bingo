const db = require('./src/helpers/dbHelper');

(async () => {
    try {
        console.log('=== Suscripciones ===');
        const [subs] = await db.query(`
            SELECT us.*, m.name as plan_name, u.username 
            FROM user_subscriptions us 
            JOIN memberships m ON us.membership_id = m.id 
            JOIN users u ON us.user_id = u.id
        `);
        console.log(JSON.stringify(subs, null, 2));
        
        console.log('\n=== Solicitudes de Membresía Pendientes ===');
        const [pending] = await db.query(`
            SELECT dr.*, u.username 
            FROM deposit_requests dr 
            JOIN users u ON dr.user_id = u.id 
            WHERE dr.request_type = 'membership_purchase' AND dr.status = 'pending'
        `);
        console.log(JSON.stringify(pending, null, 2));
        
        console.log('\n=== Todas las Solicitudes de Membresía ===');
        const [all] = await db.query(`
            SELECT dr.id, dr.user_id, u.username, dr.amount_declared, dr.status, dr.request_type, dr.created_at
            FROM deposit_requests dr 
            JOIN users u ON dr.user_id = u.id 
            WHERE dr.request_type = 'membership_purchase'
            ORDER BY dr.created_at DESC
        `);
        console.log(JSON.stringify(all, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
