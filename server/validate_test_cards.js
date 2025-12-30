const cardInventoryService = require('./src/services/cardInventoryService');
async function run() {
    const userId = 1; // Andy
    const sessionId = 103;
    const room = 'bronce';
    const quantity = 2;

    const result = await cardInventoryService.validateCards(userId, sessionId, room, quantity);
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
