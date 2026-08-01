const path = require("path");
const fs = require("fs");
const multer = require("multer");

const publicDir = path.join(__dirname, "..", "..", "public");
const imagesDir = path.join(publicDir, "images");
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imagesDir),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    cb(null, safe);
  },
});

const upload = multer({ storage });

module.exports = { upload, imagesDir, publicDir };
