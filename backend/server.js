const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const multer = require("multer");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded images from /images
const publicDir = path.join(__dirname, "public");
const imagesDir = path.join(publicDir, "images");
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
app.use("/images", express.static(imagesDir));

// Multer storage for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imagesDir),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    cb(null, safe);
  },
});
const upload = multer({ storage });

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const DB_PATH = path.join(dataDir, "inventory.db");

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      );
      return;
    }
    const hasTable = cols && cols.length > 0;
    const hasSku = hasTable && cols.some((c) => c.name === 'sku');
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
        const needed = ['id', 'name', 'quantity', 'description', 'image_url', 'qr_value', 'created_at'];
        const selectCols = needed
          .map((c) => (cols.some((col) => col.name === c) ? c : `NULL AS ${c}`))
          .join(', ');
        db.run(
          `INSERT INTO items_new (id, name, quantity, description, image_url, qr_value, created_at)
           SELECT ${selectCols} FROM items`
        );
        db.run(`DROP TABLE items`);
        db.run(`ALTER TABLE items_new RENAME TO items`);
        db.run("COMMIT");
      });
    } else {
      // Ensure image_url and qr_value columns exist (in case older table lacks them)
      db.run("ALTER TABLE items ADD COLUMN image_url TEXT", () => {});
      db.run("ALTER TABLE items ADD COLUMN qr_value TEXT", () => {});
    }
  });
});

app.get("/api/items", (req, res) => {
  db.all("SELECT * FROM items ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/items", upload.single('image'), (req, res) => {
  // Accept either JSON body or multipart/form-data with `image` file
  const body = req.body || {};
  const name = body.name;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const quantity = body.quantity ? Number(body.quantity) : 0;
  const description = body.description || null;
  let image_url = null;
  if (req.file) {
    image_url = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
  } else if (body.image_url) {
    image_url = body.image_url;
  }
  // QR value: use provided or generate one server-side
  const crypto = require('crypto');
  let qr_value = body.qr_value || null;
  if (!qr_value) {
    if (crypto.randomUUID) qr_value = crypto.randomUUID();
    else qr_value = `qr-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  }
  const stmt = db.prepare("INSERT INTO items (name, quantity, description, image_url, qr_value) VALUES (?, ?, ?, ?, ?)");
  // Insert without final qr_value, then set qr_value to a stable item-specific value (inventory:<id>)
  stmt.run(name, quantity, description, image_url, null, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const newId = this.lastID;
    const itemQr = `inventory:${newId}`;
    db.run("UPDATE items SET qr_value = ? WHERE id = ?", [itemQr, newId], function (uerr) {
      if (uerr) return res.status(500).json({ error: uerr.message });
      db.get("SELECT * FROM items WHERE id = ?", [newId], (err2, row) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(201).json(row);
      });
    });
  });
  stmt.finalize();
});

app.delete("/api/items/:id", (req, res) => {
  const id = Number(req.params.id);
  db.run("DELETE FROM items WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.put("/api/items/:id", upload.single('image'), (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const name = body.name;
  const quantity = body.quantity ? Number(body.quantity) : 0;
  const description = body.description || null;
  let image_url = null;
  if (req.file) {
    image_url = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
  } else if (body.image_url) {
    image_url = body.image_url;
  }
  const qr_value = body.qr_value || null;
  db.run(
    "UPDATE items SET name = ?, quantity = ?, description = ?, image_url = ?, qr_value = COALESCE(?, qr_value) WHERE id = ?",
    [name, quantity, description, image_url || null, qr_value, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM items WHERE id = ?", [id], (err2, row) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json(row);
      });
    }
  );
});

// Regenerate QR server-side and return updated item
app.post('/api/items/:id/regenerate-qr', (req, res) => {
  const id = Number(req.params.id);
  const crypto = require('crypto');
  let newQr;
  if (crypto.randomUUID) newQr = crypto.randomUUID();
  else newQr = `qr-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  db.run('UPDATE items SET qr_value = ? WHERE id = ?', [newQr, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM items WHERE id = ?', [id], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      res.json(row);
    });
  });
});

function startServer(port, attemptsLeft = 5) {
  const server = app
    .listen(port, () => {
      console.log(`Backend listening on http://localhost:${port} — DB: ${DB_PATH}`);
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        const nextPort = port + 1;
        console.warn(`Port ${port} in use, trying ${nextPort}...`);
        setTimeout(() => startServer(nextPort, attemptsLeft - 1), 300);
      } else {
        console.error('Server failed to start:', err);
        process.exit(1);
      }
    });
  return server;
}

startServer(PORT);
