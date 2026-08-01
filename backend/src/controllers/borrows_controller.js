const { db } = require("../config/db");

function getAllBorrows(req, res) {
  db.all("SELECT * FROM borrow_records ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}

function getBorrowById(req, res) {
  const id = Number(req.params.id);
  db.get("SELECT * FROM borrow_records WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Borrow record not found" });
    res.json(row);
  });
}

// Creates a borrow record for every item and reduces the stock of each item.
// Runs inside a transaction so a partial failure rolls everything back.
function createBorrow(req, res) {
  const body = req.body || {};
  const studentName = String(body.studentName || "").trim();
  const studentTuptId = String(body.studentId || "").trim();
  const borrowedDate = String(body.borrowedDate || "").trim();
  const dueDate = body.dueDate ? String(body.dueDate).trim() : null;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!studentName) return res.status(400).json({ error: "Student name is required" });
  if (!borrowedDate) return res.status(400).json({ error: "Borrowed date is required" });
  if (items.length === 0) return res.status(400).json({ error: "At least one item is required" });

  const normalized = items.map((it) => ({
    itemId: Number(it.itemId),
    name: String(it.name || "").trim(),
    quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
  }));

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let done = false;
    const fail = (status, message) => {
      if (done) return;
      done = true;
      db.run("ROLLBACK", () => res.status(status).json({ error: message }));
    };

    const processItem = (index) => {
      if (done) return;
      const it = normalized[index];
      db.get("SELECT id, name, quantity FROM items WHERE id = ?", [it.itemId], (err, row) => {
        if (err) return fail(500, err.message);
        if (!row) return fail(400, `Item not found (id ${it.itemId})`);
        if (row.quantity < it.quantity) {
          return fail(400, `Not enough stock for "${row.name}". Available: ${row.quantity}`);
        }
        db.run(
          `INSERT INTO borrow_records
             (student_name, student_tupt_id, item_id, item_name, quantity, borrowed_date, due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [studentName, studentTuptId, row.id, row.name, it.quantity, borrowedDate, dueDate],
          (insErr) => {
            if (insErr) return fail(500, insErr.message);
            db.run(
              "UPDATE items SET quantity = quantity - ? WHERE id = ?",
              [it.quantity, row.id],
              (updErr) => {
                if (updErr) return fail(500, updErr.message);
                if (index + 1 < normalized.length) {
                  processItem(index + 1);
                } else {
                  if (done) return;
                  done = true;
                  db.run("COMMIT", (commitErr) => {
                    if (commitErr) return res.status(500).json({ error: commitErr.message });
                    res.status(201).json({
                      message: "Borrow saved successfully",
                      student_name: studentName,
                      items: normalized.length,
                    });
                  });
                }
              }
            );
          }
        );
      });
    };

    processItem(0);
  });
}

module.exports = { getAllBorrows, getBorrowById, createBorrow };
