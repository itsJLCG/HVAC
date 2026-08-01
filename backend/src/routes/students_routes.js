const express = require("express");
const studentsController = require("../controllers/students_controller");

const router = express.Router();

router.get("/", studentsController.getAllStudents);
router.get("/by-tupt/:tupt_id", studentsController.getStudentByTuptId);
router.get("/:id", studentsController.getStudentById);
router.post("/", studentsController.createStudent);
router.put("/:id", studentsController.updateStudent);
router.delete("/:id", studentsController.deleteStudent);

module.exports = router;
