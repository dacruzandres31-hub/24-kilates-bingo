const membershipService = require('./services/membershipService');
const pool = require('./db');

async function check() {
    try {
        console.log('Checking pending purchase for user 1040...');
        const result = await membershipService.getPendingPurchase(1040);
        console.log('Result:', result);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
