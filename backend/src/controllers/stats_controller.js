const { db } = require("../config/db");

function getStats(req, res) {
  const count = (sql, params, cb) =>
    db.get(sql, params, (err, row) => {
      if (err) return cb(err);
      cb(null, row ? row.total : 0);
    });

  count("SELECT COUNT(*) AS total FROM items", [], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    count("SELECT COUNT(*) AS total FROM students", [], (err2, students) => {
      if (err2) return res.status(500).json({ error: err2.message });
      count(
        "SELECT COUNT(*) AS total FROM borrow_records WHERE status = 'Borrowed'",
        [],
        (err3, borrowed) => {
          if (err3) return res.status(500).json({ error: err3.message });
          count(
            "SELECT COUNT(*) AS total FROM borrow_records WHERE status = 'Returned'",
            [],
            (err4, returned) => {
              if (err4) return res.status(500).json({ error: err4.message });
              res.json({
                items,
                students,
                borrowed,
                returned,
              });
            }
          );
        }
      );
    });
  });
}

module.exports = { getStats };
