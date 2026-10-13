
const express = require("express");

const {
  createWorkspace,
  getWorkspaces,
} = require("../controllers/workspaceController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create a workspace
router.post("/", authMiddleware, createWorkspace);

// Get workspaces belonging to the logged-in user
router.get("/", authMiddleware, getWorkspaces);

module.exports = router;
