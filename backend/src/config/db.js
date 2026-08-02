const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const DB_PATH = path.join(dataDir, "inventory.db");

const db = new sqlite3.Database(DB_PATH);

const buildQrValue = (name) => String(name || "").trim();

function initDb() {
  db.serialize(() => {
    const normalizeQrValues = () => {
      db.run(
        "UPDATE items SET qr_value = name WHERE qr_value IS NULL OR qr_value = '' OR qr_value != name"
      );
    };

    // Ensure items table exists without `sku` column. If an older table with `sku` exists,
    // migrate data into a new table that omits the `sku` column.
    db.all("PRAGMA table_info(items)", (err, cols) => {
      if (err) {
        // Table likely doesn't exist yet — create it without sku
        db.run(
          `CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            quantity INTEGER DEFAULT 0,
            description TEXT,
            image_url TEXT,
            qr_value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`
        );
        normalizeQrValues();
        return;
      }
      const hasTable = cols && cols.length > 0;
      const hasSku = hasTable && cols.some((c) => c.name === "sku");
      if (!hasTable) {
        db.run(
          `CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            quantity INTEGER DEFAULT 0,
            description TEXT,
            image_url TEXT,
            qr_value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`
        );
        return;
      }
      if (hasSku) {
        // Migrate: create new table, copy data (excluding sku), drop old, rename
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");
          db.run(
            `CREATE TABLE IF NOT EXISTS items_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              quantity INTEGER DEFAULT 0,
              description TEXT,
              image_url TEXT,
              qr_value TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
          );
          // Build a safe SELECT that provides NULL for missing columns.
          const needed = ["id", "name", "quantity", "description", "image_url", "qr_value", "created_at"];
          const selectCols = needed
            .map((c) => (cols.some((col) => col.name === c) ? c : `NULL AS ${c}`))
            .join(", ");
          db.run(
            `INSERT INTO items_new (id, name, quantity, description, image_url, qr_value, created_at)
             SELECT ${selectCols} FROM items`
          );
          db.run(`DROP TABLE items`);
          db.run(`ALTER TABLE items_new RENAME TO items`);
          db.run("COMMIT");
          normalizeQrValues();
        });
      } else {
        // Ensure image_url and qr_value columns exist (in case older table lacks them)
        db.run("ALTER TABLE items ADD COLUMN image_url TEXT", () => { });
        db.run("ALTER TABLE items ADD COLUMN qr_value TEXT", () => { });
        normalizeQrValues();
      }
    });
  });
}

/*function initStudentsDb() {
  db.run(
    `CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tupt_id TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      course TEXT,
      year_level TEXT,
      email TEXT,
      contact_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err) console.error("Failed to create students table:", err.message);
    }
  );
} */

function initStudentsDb() {
  db.all("PRAGMA table_info(students)", (err, cols) => {
    if (err || !cols || cols.length === 0) {
      db.run(
        `CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tupt_id TEXT NOT NULL UNIQUE,
          full_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (createErr) => {
          if (createErr) console.error("Failed to create students table:", createErr.message);
        }
      );
      return;
    }

    const colNames = cols.map((c) => c.name);
    const extraCols = ["course", "year_level", "email", "contact_number"];
    const hasExtra = extraCols.some((c) => colNames.includes(c));

    if (!hasExtra) return; // already simplified, nothing to do

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      db.run(
        `CREATE TABLE IF NOT EXISTS students_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tupt_id TEXT NOT NULL UNIQUE,
          full_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      );
      db.run(
        `INSERT INTO students_new (id, tupt_id, full_name, created_at)
         SELECT id, tupt_id, full_name, created_at FROM students`
      );
      db.run("DROP TABLE students");
      db.run("ALTER TABLE students_new RENAME TO students");
      db.run("COMMIT", (commitErr) => {
        if (commitErr) console.error("Students migration failed:", commitErr.message);
        else console.log("Students table simplified (removed course/year_level/email/contact_number).");
      });
    });
  });
}

function initBorrowsDb() {
  db.all("PRAGMA table_info(borrow_records)", (err, cols) => {
    if (err || !cols || cols.length === 0) {
      db.run(
        `CREATE TABLE IF NOT EXISTS borrow_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_name TEXT NOT NULL,
          student_tupt_id TEXT,
          item_id INTEGER,
          item_name TEXT NOT NULL,
          quantity INTEGER DEFAULT 1,
          borrowed_date TEXT NOT NULL,
          due_date TEXT,
          status TEXT DEFAULT 'Borrowed',
          returned_date TEXT,
          group_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (createErr) => {
          if (createErr) console.error("Failed to create borrow_records table:", createErr.message);
        }
      );
      return;
    }

    const colNames = cols.map((c) => c.name);
    if (!colNames.includes("returned_date")) {
      db.run("ALTER TABLE borrow_records ADD COLUMN returned_date TEXT", (e) => {
        if (e) console.error("Failed to add returned_date column:", e.message);
      });
    }
    if (!colNames.includes("group_id")) {
      db.run("ALTER TABLE borrow_records ADD COLUMN group_id TEXT", (e) => {
        if (e) console.error("Failed to add group_id column:", e.message);
      });
    }
  });
}

module.exports = { db, DB_PATH, initDb, buildQrValue, initStudentsDb, initBorrowsDb };
