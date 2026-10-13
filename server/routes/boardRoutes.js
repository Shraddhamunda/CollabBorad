
const express = require("express");

const {
  getBoards,
  createBoard,
  createDefaultBoard,
} = require("../controllers/boardController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:workspaceId", authMiddleware, getBoards);
router.post("/:workspaceId", authMiddleware, createBoard);
router.post("/:workspaceId/default", authMiddleware, createDefaultBoard);

module.exports = router;
