
const express = require("express");

const {
  createWorkspace,
  getWorkspaces,
  joinWorkspace
} = require("../controllers/workspaceController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create a workspace
router.post("/", authMiddleware, createWorkspace);

// Get workspaces belonging to the logged-in user
router.get("/", authMiddleware, getWorkspaces);

//join the existing user or new user to the workspace
router.post("/join", authMiddleware, joinWorkspace);


module.exports = router;
