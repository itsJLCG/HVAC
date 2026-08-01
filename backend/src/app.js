const express = require("express");
const cors = require("cors");

const { initDb, initStudentsDb, initBorrowsDb } = require("./config/db");
const { imagesDir } = require("./middleware/upload");
const itemsRoutes = require("./routes/items_routes");
const studentsRoutes = require("./routes/students_routes");
const statsRoutes = require("./routes/stats_routes");
const borrowsRoutes = require("./routes/borrows_routes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded images from /images
app.use("/images", express.static(imagesDir));

// Initialize DB (creates table / runs migrations as needed)
initDb();
initStudentsDb();
initBorrowsDb();

// Routes
app.use("/api/items", itemsRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/borrows", borrowsRoutes);

module.exports = app;
