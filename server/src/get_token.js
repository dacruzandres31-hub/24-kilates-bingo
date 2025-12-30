const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_12345';

const token = jwt.sign({ id: 1, role: 'superadmin' }, SECRET, { expiresIn: '30d' });
console.log(token);
process.exit(0);
