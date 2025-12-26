const pool = require('./src/db');

async function migrate() {
  try {
    console.log('Adding "level"...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN level INT DEFAULT 1');
      console.log('Added level.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column "level" already exists.');
      } else {
        console.log('Error adding level:', e.message);
      }
    }

    console.log('Adding "current_xp"...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN current_xp INT DEFAULT 0');
      console.log('Added current_xp.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column "current_xp" already exists.');
      } else {
        console.log('Error adding current_xp:', e.message);
      }
    }

    console.log('Adding "total_xp"...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN total_xp INT DEFAULT 0');
      console.log('Added total_xp.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column "total_xp" already exists.');
      } else {
        console.log('Error adding total_xp:', e.message);
      }
    }

    console.log('Migration attempts finished.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
