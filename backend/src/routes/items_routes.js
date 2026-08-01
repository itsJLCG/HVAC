const express = require("express");
const { upload } = require("../middleware/upload");
const itemsController = require("../controllers/items_controller");

const router = express.Router();

router.get("/", itemsController.getAllItems);
router.get("/by-qr/:qr_value", itemsController.getItemByQr);
router.get("/:id", itemsController.getItemById);
router.post("/", upload.single("image"), itemsController.createItem);
router.put("/:id", upload.single("image"), itemsController.updateItem);
router.delete("/:id", itemsController.deleteItem);
router.post("/:id/regenerate-qr", itemsController.regenerateQr);

module.exports = router;
