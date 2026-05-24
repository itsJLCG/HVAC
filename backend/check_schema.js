const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'inventory.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open DB:', err.message);
    process.exit(1);
  }
});

db.all("PRAGMA table_info(items)", (err, rows) => {
  if (err) {
    console.error('Error querying schema:', err.message);
    db.close();
    process.exit(1);
  }
  console.log('items table schema:');
  rows.forEach((r) => {
    console.log(`${r.cid}: ${r.name} (${r.type}) notnull=${r.notnull} dflt=${r.dflt_value} pk=${r.pk}`);
  });
  if (rows.length === 0) console.log('(no items table found)');
  db.close();
});
