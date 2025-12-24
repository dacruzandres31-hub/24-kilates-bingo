try {
    console.log('Requiring gamification_engine...');
    const ge = require('./server/src/services/gamification_engine.js');
    console.log('Success!');
} catch (e) {
    console.error('CRASH:', e);
}
