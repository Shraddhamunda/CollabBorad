const pool = require("../db");

const createWorkspace = async (req, res) => {
    try {
        const { name } = req.body;

        // Check workspace name
        if (!name) {
            return res.status(400).json({
                message: "Workspace name is required"
            });
        }

        // Create workspace
        const result = await pool.query(
            `INSERT INTO workspaces (name, owner_id)
             VALUES ($1, $2)
             RETURNING id, name, owner_id, created_at`,
            [name, req.user.userId]
        );

        // Add owner as a workspace member
        await pool.query(
            `INSERT INTO workspace_members (workspace_id, user_id, role)
             VALUES ($1, $2, $3)`,
            [result.rows[0].id, req.user.userId, "owner"]
        );

        res.status(201).json({
            message: "Workspace created successfully",
            workspace: result.rows[0]
        });

    } catch (error) {
        console.error("Create workspace error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    createWorkspace
};