
const pool = require("../db");

// GET ALL BOARDS IN A WORKSPACE
const getBoards = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Check whether the logged-in user belongs to this workspace.
    const membership = await pool.query(
      `SELECT id
       FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const result = await pool.query(
      `SELECT id, workspace_id, name, created_by, created_at
       FROM boards
       WHERE workspace_id = $1
       ORDER BY created_at ASC`,
      [workspaceId]
    );

    return res.status(200).json({
      boards: result.rows,
    });
  } catch (error) {
    console.error("Get boards error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// CREATE A NEW BOARD
const createBoard = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Board name is required",
      });
    }

    // Check workspace membership.
    const membership = await pool.query(
      `SELECT id
       FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const result = await pool.query(
      `INSERT INTO boards (workspace_id, name, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, workspace_id, name, created_by, created_at`,
      [workspaceId, name.trim(), req.user.userId]
    );

    return res.status(201).json({
      message: "Board created successfully",
      board: result.rows[0],
    });
  } catch (error) {
    console.error("Create board error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// GET OR CREATE THE DEFAULT BOARD
const createDefaultBoard = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify workspace membership before accessing its boards.
    const membership = await pool.query(
      `SELECT id
       FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    // Return the first existing board if available.
    const existingBoard = await pool.query(
      `SELECT id, workspace_id, name, created_by, created_at
       FROM boards
       WHERE workspace_id = $1
       ORDER BY created_at ASC
       LIMIT 1`,
      [workspaceId]
    );

    if (existingBoard.rows.length > 0) {
      return res.status(200).json({
        board: existingBoard.rows[0],
      });
    }

    // Otherwise, create the default board.
    const result = await pool.query(
      `INSERT INTO boards (workspace_id, name, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, workspace_id, name, created_by, created_at`,
      [workspaceId, "Main Board", req.user.userId]
    );

    return res.status(201).json({
      message: "Default board created successfully",
      board: result.rows[0],
    });
  } catch (error) {
    console.error("Create default board error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getBoards,
  createBoard,
  createDefaultBoard,
};
