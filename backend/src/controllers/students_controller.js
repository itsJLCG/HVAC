const { db } = require("../config/db");
const XLSX = require("xlsx");

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

// Search by TUPT ID (exact, case-insensitive) or student name (contains).
// Returns a ranked list so an exact ID match always comes first.
function searchStudent(req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Search query is required" });

  const compactQ = q.replace(/\s+/g, "");
  const like = `%${q}%`;

  db.all(
    `SELECT *, CASE
        WHEN tupt_id = ? COLLATE NOCASE THEN 0
        WHEN REPLACE(tupt_id, ' ', '') = ? COLLATE NOCASE THEN 1
        ELSE 2
      END AS match_rank
      FROM students
      WHERE tupt_id = ? COLLATE NOCASE
         OR REPLACE(tupt_id, ' ', '') = ? COLLATE NOCASE
         OR full_name LIKE ? COLLATE NOCASE
      ORDER BY match_rank ASC, full_name ASC
      LIMIT 10`,
    [q, compactQ, q, compactQ, like],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "No student found for this TUPT ID or name" });
      }
      res.json(rows);
    }
  );
}

function createStudent(req, res) {
  const body = req.body || {};
  const tupt_id = String(body.tupt_id || "").trim();
  const full_name = String(body.full_name || "").trim();
  if (!tupt_id) return res.status(400).json({ error: "tupt_id is required" });
  if (!full_name) return res.status(400).json({ error: "full_name is required" });

  const stmt = db.prepare(
    "INSERT INTO students (tupt_id, full_name) VALUES (?, ?)"
  );
  stmt.run(tupt_id, full_name, function (err) {
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

  db.run(
    "UPDATE students SET tupt_id = ?, full_name = ? WHERE id = ?",
    [tupt_id, full_name, id],
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

// Bulk import from an uploaded .csv/.xlsx/.xls file.
// Looks for columns like "Student No." / "Student Name" (also accepts
// tupt_id / full_name, or a few common variants).
function importStudents(req, res) {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  let rows;
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } catch (err) {
    return res.status(400).json({ error: "Failed to parse file: " + err.message });
  }

  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: "File contains no data rows" });
  }

  const findKey = (row, candidates) => {
    const keys = Object.keys(row);
    return (
      keys.find((k) =>
        candidates.includes(k.trim().toLowerCase().replace(/\.$/, ""))
      ) || null
    );
  };

  const students = [];
  const skipped = [];

  rows.forEach((row, idx) => {
    const idKey = findKey(row, ["student no", "tupt_id", "student number", "id no"]);
    const nameKey = findKey(row, ["student name", "full_name", "name"]);

    const tupt_id = idKey ? String(row[idKey]).trim() : "";
    const full_name = nameKey ? String(row[nameKey]).trim() : "";

    if (!tupt_id || !full_name) {
      skipped.push({ row: idx + 2, reason: "Missing Student No. or Student Name" });
      return;
    }
    students.push({ tupt_id, full_name });
  });

  if (students.length === 0) {
    return res.status(400).json({
      error: "No valid rows found. Expecting columns like 'Student No.' and 'Student Name'.",
      skipped,
    });
  }

  // Upsert: re-importing the same file updates names instead of erroring on duplicates.
  const stmt = db.prepare(
    `INSERT INTO students (tupt_id, full_name) VALUES (?, ?)
     ON CONFLICT(tupt_id) DO UPDATE SET full_name = excluded.full_name`
  );

  let processed = 0;
  const errors = [];

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    students.forEach((s) => {
      stmt.run(s.tupt_id, s.full_name, (err) => {
        if (err) errors.push({ tupt_id: s.tupt_id, error: err.message });
        else processed++;
      });
    });
    stmt.finalize();
    db.run("COMMIT", (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: "Import complete",
        total_rows: rows.length,
        imported_or_updated: processed,
        skipped,
        errors,
      });
    });
  });
}

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentByTuptId,
  searchStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  importStudents,
};