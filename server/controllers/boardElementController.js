
const pool = require("../db");

// GET ALL ELEMENTS OF A BOARD
const getBoardElements = async (req, res) => {
  try {
    const { boardId } = req.params;

    // Verify that the user belongs to the board's workspace.
    const membership = await pool.query(
      `SELECT wm.id
       FROM workspace_members wm
       JOIN boards b ON b.workspace_id = wm.workspace_id
       WHERE b.id = $1 AND wm.user_id = $2`,
      [boardId, req.user.userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({
        message: "You do not have access to this board",
      });
    }

    const result = await pool.query(
      `SELECT id, board_id, element_type, x, y, width, height,
              points, text_content, stroke_color, stroke_width,
              created_by, created_at, updated_at
       FROM board_elements
       WHERE board_id = $1
       ORDER BY created_at ASC`,
      [boardId]
    );

    return res.status(200).json({
      elements: result.rows,
    });
  } catch (error) {
    console.error("Get board elements error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// SAVE A NEW BOARD ELEMENT
const createBoardElement = async (req, res) => {
  try {
    const { boardId } = req.params;

    const {
      element_type,
      x,
      y,
      width,
      height,
      points,
      text_content,
      stroke_color,
      stroke_width,
    } = req.body;

    if (
      !element_type ||
      !["pen", "eraser", "rectangle", "circle", "line", "text"].includes(
        element_type
      )
    ) {
      return res.status(400).json({
        message: "A valid element_type is required",
      });
    }

    const membership = await pool.query(
      `SELECT wm.id
       FROM workspace_members wm
       JOIN boards b ON b.workspace_id = wm.workspace_id
       WHERE b.id = $1 AND wm.user_id = $2`,
      [boardId, req.user.userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({
        message: "You do not have access to this board",
      });
    }

    const result = await pool.query(
      `INSERT INTO board_elements
       (board_id, element_type, x, y, width, height, points,
        text_content, stroke_color, stroke_width, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        boardId,
        element_type,
        x ?? 0,
        y ?? 0,
        width ?? 0,
        height ?? 0,
        points == null ? null : JSON.stringify(points),
        text_content ?? null,
        stroke_color ?? "#000000",
        stroke_width ?? 4,
        req.user.userId,
      ]
    );

    return res.status(201).json({
      message: "Board element saved successfully",
      element: result.rows[0],
    });
  } catch (error) {
    console.error("Create board element error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getBoardElements,
  createBoardElement,
};
