const db = require('./src/helpers/dbHelper');

(async () => {
    try {
        console.log('=== Testing Membership Accounting Queries ===\n');
        
        // 1. Active subscriptions
        const [activeSubs] = await db.query(`
            SELECT us.*, m.name as plan_name, m.price, u.username
            FROM user_subscriptions us
            JOIN memberships m ON us.membership_id = m.id
            JOIN users u ON us.user_id = u.id
            WHERE us.status = 'active'
        `);
        console.log('Active Subscriptions:', JSON.stringify(activeSubs, null, 2));
        
        // 2. Calculate tier stats
        const tierStats = {
            embajador: { count: 0, revenue: 0, price: 0 },
            bronce: { count: 0, revenue: 0, price: 0 },
            plata: { count: 0, revenue: 0, price: 0 },
            oro: { count: 0, revenue: 0, price: 0 }
        };
        
        let totalActive = 0;
        let totalMRR = 0;
        
        (activeSubs || []).forEach(sub => {
            const planName = (sub.plan_name || '').toLowerCase();
            const price = parseFloat(sub.price) || 0;
            
            totalActive++;
            totalMRR += price;
            
            if (planName.includes('embajador')) {
                tierStats.embajador.count++;
                tierStats.embajador.revenue += price;
                tierStats.embajador.price = price;
            } else if (planName.includes('oro')) {
                tierStats.oro.count++;
                tierStats.oro.revenue += price;
                tierStats.oro.price = price;
            } else if (planName.includes('plata')) {
                tierStats.plata.count++;
                tierStats.plata.revenue += price;
                tierStats.plata.price = price;
            } else if (planName.includes('bronce')) {
                tierStats.bronce.count++;
                tierStats.bronce.revenue += price;
                tierStats.bronce.price = price;
            }
        });
        
        console.log('\nTotal Active:', totalActive);
        console.log('Total MRR:', totalMRR);
        console.log('Tier Stats:', JSON.stringify(tierStats, null, 2));
        
        // 3. Pending requests
        const [pendingRequests] = await db.query(`
            SELECT dr.*, u.username
            FROM deposit_requests dr
            JOIN users u ON dr.user_id = u.id
            WHERE dr.request_type = 'membership_purchase' AND dr.status = 'pending'
        `);
        console.log('\nPending Requests:', JSON.stringify(pendingRequests, null, 2));
        
        // 4. Current month revenue
        const [monthlyApproved] = await db.query(`
            SELECT SUM(amount_declared) as total
            FROM deposit_requests
            WHERE request_type = 'membership_purchase'
                AND status = 'approved'
                AND MONTH(updated_at) = MONTH(CURRENT_DATE())
                AND YEAR(updated_at) = YEAR(CURRENT_DATE())
        `);
        console.log('\nCurrent Month Revenue:', monthlyApproved?.[0]?.total || 0);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
