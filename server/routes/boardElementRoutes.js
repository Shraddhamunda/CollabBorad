
const express = require("express");

const {
  getBoardElements,
  createBoardElement,
} = require("../controllers/boardElementController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:boardId/elements", authMiddleware, getBoardElements);
router.post("/:boardId/elements", authMiddleware, createBoardElement);

module.exports = router;
