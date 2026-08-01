const { db, buildQrValue } = require("../config/db");

function getAllItems(req, res) {
  db.all("SELECT * FROM items ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}

function getItemByQr(req, res) {
  const qrValue = req.params.qr_value;
  db.get(
    "SELECT * FROM items WHERE qr_value = ? COLLATE NOCASE",
    [qrValue],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Item not found" });
      res.json(row);
    }
  );
}

function getItemById(req, res) {
  const id = Number(req.params.id);
  db.get("SELECT * FROM items WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Item not found" });
    res.json(row);
  });
}

function createItem(req, res) {
  // Accept either JSON body or multipart/form-data with `image` file
  const body = req.body || {};
  const name = body.name;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const quantity = body.quantity ? Number(body.quantity) : 0;
  const description = body.description || null;
  let image_url = null;
  if (req.file) {
    image_url = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
  } else if (body.image_url) {
    image_url = body.image_url;
  }
  const qr_value = buildQrValue(name);
  const stmt = db.prepare(
    "INSERT INTO items (name, quantity, description, image_url, qr_value) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(name, quantity, description, image_url, qr_value, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const newId = this.lastID;
    db.get("SELECT * FROM items WHERE id = ?", [newId], (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.status(201).json(row);
    });
  });
  stmt.finalize();
}

function deleteItem(req, res) {
  const id = Number(req.params.id);
  db.run("DELETE FROM items WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
}

function updateItem(req, res) {
  const id = Number(req.params.id);
  const body = req.body || {};
  const name = body.name;
  const quantity = body.quantity ? Number(body.quantity) : 0;
  const description = body.description || null;
  let image_url = null;
  if (req.file) {
    image_url = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
  } else if (body.image_url) {
    image_url = body.image_url;
  }
  const qr_value = buildQrValue(name);
  db.run(
    "UPDATE items SET name = ?, quantity = ?, description = ?, image_url = ?, qr_value = ? WHERE id = ?",
    [name, quantity, description, image_url || null, qr_value, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM items WHERE id = ?", [id], (err2, row) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json(row);
      });
    }
  );
}

function regenerateQr(req, res) {
  const id = Number(req.params.id);
  db.get("SELECT name FROM items WHERE id = ?", [id], (findErr, row) => {
    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!row) return res.status(404).json({ error: "Item not found" });
    const qrValue = buildQrValue(row.name);
    db.run("UPDATE items SET qr_value = ? WHERE id = ?", [qrValue, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM items WHERE id = ?", [id], (e, updatedRow) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json(updatedRow);
      });
    });
  });
}

module.exports = {
  getAllItems,
  getItemByQr,
  getItemById,
  createItem,
  deleteItem,
  updateItem,
  regenerateQr,
};
