
const pool = require("../db");

// Check whether the user belongs to the board's workspace.
const checkBoardAccess = async (boardId, userId) => {
  const result = await pool.query(
    `SELECT b.id
     FROM boards b
     JOIN workspace_members wm
       ON wm.workspace_id = b.workspace_id
     WHERE b.id = $1 AND wm.user_id = $2`,
    [boardId, userId]
  );

  return result.rows.length > 0;
};

// GET ALL ELEMENTS OF A BOARD
const getBoardElements = async (req, res) => {
  try {
    const { boardId } = req.params;

    const hasAccess = await checkBoardAccess(
      boardId,
      req.user.userId
    );

    if (!hasAccess) {
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

// SAVE ONE ELEMENT (kept for backward compatibility)
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

    const hasAccess = await checkBoardAccess(
      boardId,
      req.user.userId
    );

    if (!hasAccess) {
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

// SAVE THE COMPLETE DRAWING IN ONE TRANSACTION
const saveBoardElements = async (req, res) => {
  const client = await pool.connect();

  try {
    const { boardId } = req.params;
    const { elements } = req.body;

    if (!Array.isArray(elements)) {
      return res.status(400).json({
        message: "elements must be an array",
      });
    }

    const validTypes = [
      "pen",
      "eraser",
      "rectangle",
      "circle",
      "line",
      "text",
    ];

    const invalidElement = elements.some(
      (element) =>
        !element ||
        !validTypes.includes(element.element_type)
    );

    if (invalidElement) {
      return res.status(400).json({
        message: "One or more elements have an invalid element_type",
      });
    }

    const hasAccess = await checkBoardAccess(
      boardId,
      req.user.userId
    );

    if (!hasAccess) {
      return res.status(403).json({
        message: "You do not have access to this board",
      });
    }

    await client.query("BEGIN");

    await client.query(
      "DELETE FROM board_elements WHERE board_id = $1",
      [boardId]
    );

    for (const element of elements) {
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
      } = element;

      await client.query(
        `INSERT INTO board_elements
         (board_id, element_type, x, y, width, height, points,
          text_content, stroke_color, stroke_width, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)`,
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
    }

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Drawing saved successfully",
      savedCount: elements.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Save board elements error:", error);

    return res.status(500).json({
      message: "Could not save drawing",
    });
  } finally {
    client.release();
  }
};

// CLEAR THE SAVED DRAWING
const clearBoardElements = async (req, res) => {
  try {
    const { boardId } = req.params;

    const hasAccess = await checkBoardAccess(
      boardId,
      req.user.userId
    );

    if (!hasAccess) {
      return res.status(403).json({
        message: "You do not have access to this board",
      });
    }

    await pool.query(
      "DELETE FROM board_elements WHERE board_id = $1",
      [boardId]
    );

    return res.status(200).json({
      message: "Canvas cleared successfully",
    });
  } catch (error) {
    console.error("Clear board elements error:", error);

    return res.status(500).json({
      message: "Could not clear canvas",
    });
  }
};

module.exports = {
  getBoardElements,
  createBoardElement,
  saveBoardElements,
  clearBoardElements,
};
