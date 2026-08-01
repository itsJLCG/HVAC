const express = require("express");
const statsController = require("../controllers/stats_controller");

const router = express.Router();

router.get("/", statsController.getStats);

module.exports = router;
