const membershipController = require('./controllers/membershipController');
const pool = require('./db');

async function debug_api() {
    try {
        console.log('Simulating GET /api/memberships/subscription-details for user 1040...');

        const req = { user: { id: 1040 } };
        const res = {
            json: (data) => {
                console.log('✅ API Response:', JSON.stringify(data, null, 2));
            },
            status: (code) => {
                console.log('❌ Status Code:', code);
                return { json: (data) => console.log('❌ Error Response:', data) };
            }
        };

        await membershipController.getSubscription(req, res);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug_api();
