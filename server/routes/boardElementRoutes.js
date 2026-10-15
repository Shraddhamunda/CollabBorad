
const express = require("express");

const {
  getBoardElements,
  createBoardElement,
  saveBoardElements,
  clearBoardElements,
} = require("../controllers/boardElementController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:boardId/elements", authMiddleware, getBoardElements);

router.post("/:boardId/elements", authMiddleware, createBoardElement);

router.put("/:boardId/elements/save", authMiddleware, saveBoardElements);

router.delete("/:boardId/elements/clear", authMiddleware, clearBoardElements);

module.exports = router;
