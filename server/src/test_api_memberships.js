const axios = require('axios');

async function testApi() {
    try {
        console.log('Fetching from http://localhost:3000/api/memberships ...');
        const res = await axios.get('http://localhost:3000/api/memberships');
        console.log('Status:', res.status);
        console.log('Plans count:', res.data.length);
        res.data.forEach(p => {
            console.log(`- [${p.id}] ${p.name} ($${p.price})`);
        });
    } catch (error) {
        console.error('API Error:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

testApi();
