const express = require("express");
const cors = require("cors");

const { initDb, initStudentsDb } = require("./config/db");
const { imagesDir } = require("./middleware/upload");
const itemsRoutes = require("./routes/items_routes");
const studentsRoutes = require("./routes/students_routes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded images from /images
app.use("/images", express.static(imagesDir));

// Initialize DB (creates table / runs migrations as needed)
initDb();
initStudentsDb();

// Routes
app.use("/api/items", itemsRoutes);
app.use("/api/students", studentsRoutes);

module.exports = app;
