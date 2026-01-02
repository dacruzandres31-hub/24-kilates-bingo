try {
    console.log('Testing requirements...');
    require('./db');
    console.log('db ok');
    require('./services/scheduler');
    console.log('scheduler ok');
    require('./routes/authRoutes');
    console.log('authRoutes ok');
    require('./routes/userRoutes');
    console.log('userRoutes ok');
    require('./routes/gameRoutes');
    console.log('gameRoutes ok');
    require('./routes/financeRoutes');
    console.log('financeRoutes ok');
    require('./routes/referralRoutes');
    console.log('referralRoutes ok');
    require('./routes/depositRoutes');
    console.log('depositRoutes ok');
    require('./routes/commissionRoutes');
    console.log('commissionRoutes ok');
    console.log('Success: All main routes loaded.');
} catch (e) {
    console.error('FAILED REQUIRE:', e.message);
    if (e.stack) console.error(e.stack);
}
