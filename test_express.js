const express = require('express');
const app = express();

app.use(express.json());

app.post('/test', (req, res) => {
  console.log('Body:', req.body);
  console.log('Body type:', typeof req.body);
  console.log('Body keys:', Object.keys(req.body || {}));
  res.json({ received: req.body });
});

app.listen(3099, () => console.log('Test server on 3099'));
