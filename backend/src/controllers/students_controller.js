const { db } = require("../config/db");

function getAllStudents(req, res) {
  db.all("SELECT * FROM students ORDER BY full_name ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}

function getStudentById(req, res) {
  const id = Number(req.params.id);
  db.get("SELECT * FROM students WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Student not found" });
    res.json(row);
  });
}

// Lookup by TUPT ID number — this is what the barcode scanner calls
function getStudentByTuptId(req, res) {
  const tuptId = String(req.params.tupt_id || "").trim();
  db.get(
    "SELECT * FROM students WHERE tupt_id = ? COLLATE NOCASE",
    [tuptId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Student not found" });
      res.json(row);
    }
  );
}

function createStudent(req, res) {
  const body = req.body || {};
  const tupt_id = String(body.tupt_id || "").trim();
  const full_name = String(body.full_name || "").trim();
  if (!tupt_id) return res.status(400).json({ error: "tupt_id is required" });
  if (!full_name) return res.status(400).json({ error: "full_name is required" });

  const course = body.course || null;
  const year_level = body.year_level || null;
  const email = body.email || null;
  const contact_number = body.contact_number || null;

  const stmt = db.prepare(
    "INSERT INTO students (tupt_id, full_name, course, year_level, email, contact_number) VALUES (?, ?, ?, ?, ?, ?)"
  );
  stmt.run(tupt_id, full_name, course, year_level, email, contact_number, function (err) {
    if (err) {
      if (String(err.message || "").includes("UNIQUE")) {
        return res.status(409).json({ error: "A student with this TUPT ID already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    const newId = this.lastID;
    db.get("SELECT * FROM students WHERE id = ?", [newId], (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.status(201).json(row);
    });
  });
  stmt.finalize();
}

function updateStudent(req, res) {
  const id = Number(req.params.id);
  const body = req.body || {};
  const tupt_id = String(body.tupt_id || "").trim();
  const full_name = String(body.full_name || "").trim();
  if (!tupt_id) return res.status(400).json({ error: "tupt_id is required" });
  if (!full_name) return res.status(400).json({ error: "full_name is required" });

  const course = body.course || null;
  const year_level = body.year_level || null;
  const email = body.email || null;
  const contact_number = body.contact_number || null;

  db.run(
    `UPDATE students SET tupt_id = ?, full_name = ?, course = ?, year_level = ?, email = ?, contact_number = ?
     WHERE id = ?`,
    [tupt_id, full_name, course, year_level, email, contact_number, id],
    function (err) {
      if (err) {
        if (String(err.message || "").includes("UNIQUE")) {
          return res.status(409).json({ error: "A student with this TUPT ID already exists" });
        }
        return res.status(500).json({ error: err.message });
      }
      db.get("SELECT * FROM students WHERE id = ?", [id], (err2, row) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (!row) return res.status(404).json({ error: "Student not found" });
        res.json(row);
      });
    }
  );
}

function deleteStudent(req, res) {
  const id = Number(req.params.id);
  db.run("DELETE FROM students WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
}

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentByTuptId,
  createStudent,
  updateStudent,
  deleteStudent,
};
