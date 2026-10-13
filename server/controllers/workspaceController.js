
const pool = require("../db");

// ==================== CREATE WORKSPACE ====================

const createWorkspace = async (req, res) => {
    try {
        const { name } = req.body;

        // Validate workspace name
        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Workspace name is required"
            });
        }

        // Create workspace
        const result = await pool.query(
            `INSERT INTO workspaces (name, owner_id)
             VALUES ($1, $2)
             RETURNING id, name, owner_id, created_at`,
            [name.trim(), req.user.userId]
        );

        const workspace = result.rows[0];

        // Add creator as workspace owner
        await pool.query(
            `INSERT INTO workspace_members
             (workspace_id, user_id, role)
             VALUES ($1, $2, $3)`,
            [workspace.id, req.user.userId, "owner"]
        );

        return res.status(201).json({
            message: "Workspace created successfully",
            workspace
        });

    } catch (error) {
        console.error("Create workspace error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==================== GET ALL WORKSPACES ====================

const getWorkspaces = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                w.id,
                w.name,
                w.owner_id,
                w.created_at,
                wm.role
             FROM workspaces w
             JOIN workspace_members wm
                ON w.id = wm.workspace_id
             WHERE wm.user_id = $1
             ORDER BY w.created_at DESC`,
            [req.user.userId]
        );

        return res.status(200).json({
            workspaces: result.rows
        });

    } catch (error) {
        console.error("Get workspaces error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==================== EXPORT CONTROLLERS ====================

module.exports = {
    createWorkspace,
    getWorkspaces
};
