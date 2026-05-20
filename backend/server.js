const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const DB_PATH = path.join(dataDir, "inventory.db");

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT,
      quantity INTEGER DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );
});

app.get("/api/items", (req, res) => {
  db.all("SELECT * FROM items ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/items", (req, res) => {
  const { name, sku, quantity, description } = req.body || {};
  if (!name) return res.status(400).json({ error: "Name is required" });
  const stmt = db.prepare("INSERT INTO items (name, sku, quantity, description) VALUES (?, ?, ?, ?)");
  stmt.run(name, sku || null, quantity || 0, description || null, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT * FROM items WHERE id = ?", [this.lastID], (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.status(201).json(row);
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

app.put("/api/items/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, sku, quantity, description } = req.body || {};
  db.run(
    "UPDATE items SET name = ?, sku = ?, quantity = ?, description = ? WHERE id = ?",
    [name, sku, quantity, description, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM items WHERE id = ?", [id], (err2, row) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json(row);
      });
    }
  );
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
