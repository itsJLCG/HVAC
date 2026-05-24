const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'inventory.db');

console.log('Opening DB:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open DB:', err.message);
    process.exit(1);
  }
});

function runAsync(sql, params=[]) {
  return new Promise((resolve, reject) => db.run(sql, params, function(err) {
    if (err) reject(err); else resolve(this);
  }));
}
function allAsync(sql, params=[]) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => {
    if (err) reject(err); else resolve(rows);
  }));
}

(async () => {
  try {
    const cols = await allAsync("PRAGMA table_info(items)");
    if (!cols || cols.length === 0) {
      console.warn('No items table found — nothing to migrate.');
      db.close();
      return;
    }
    const hasSku = cols.some(c => c.name === 'sku');
    if (!hasSku) {
      console.log('`sku` column not present; nothing to do.');
      db.close();
      return;
    }
    console.log('`sku` detected — performing migration.');
    // create new table
    await runAsync('BEGIN TRANSACTION');
    await runAsync(`CREATE TABLE IF NOT EXISTS items_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      description TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    // build select columns, providing NULL for missing ones
    const needed = ['id','name','quantity','description','image_url','created_at'];
    const selectCols = needed.map(c => (cols.some(col => col.name === c) ? c : `NULL AS ${c}`)).join(', ');
    await runAsync(`INSERT INTO items_new (id, name, quantity, description, image_url, created_at)
                    SELECT ${selectCols} FROM items`);
    await runAsync('DROP TABLE items');
    await runAsync('ALTER TABLE items_new RENAME TO items');
    await runAsync('COMMIT');
    console.log('Migration complete — `sku` removed.');
    // show new schema
    const newCols = await allAsync("PRAGMA table_info(items)");
    console.log('New schema:');
    newCols.forEach(c => console.log(`${c.cid}: ${c.name} (${c.type}) notnull=${c.notnull} dflt=${c.dflt_value} pk=${c.pk}`));
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    try { await runAsync('ROLLBACK'); } catch (e) {}
  } finally {
    db.close();
  }
})();
