const express = require("express");
const borrowsController = require("../controllers/borrows_controller");

const router = express.Router();

router.get("/", borrowsController.getAllBorrows);
router.get("/:id", borrowsController.getBorrowById);
router.post("/", borrowsController.createBorrow);

module.exports = router;
