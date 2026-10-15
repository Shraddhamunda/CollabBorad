const pool = require("../db");

//===== generate invitation code=====

const generateInviteCode = () => {
    return (
        "CB-" +
        require("crypto")
            .randomBytes(4)
            .toString("hex")
            .toUpperCase()
    );
};

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

        const inviteCode = generateInviteCode();

        // Create workspace
        const result = await pool.query(
            `INSERT INTO workspaces (name, owner_id,invite_code)
             VALUES ($1, $2,$3)
             RETURNING id, name, owner_id, created_at`,
            [name.trim(), req.user.userId,inviteCode]
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
                w.invite_code,
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


const joinWorkspace = async (req, res) => {
    try {
        const { inviteCode } = req.body;

        if (!inviteCode || !inviteCode.trim()) {
            return res.status(400).json({
                message: "Invite code is required",
            });
        }

        const normalizedCode = inviteCode.trim().toUpperCase();

        const result = await pool.query(
            `SELECT id, name, owner_id
             FROM workspaces
             WHERE invite_code = $1`,
            [normalizedCode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Invalid invite code",
            });
        }

        const workspace = result.rows[0];

        // Check whether the user is already a member.
        const existingMember = await pool.query(
            `SELECT 1
             FROM workspace_members
             WHERE workspace_id = $1 AND user_id = $2`,
            [workspace.id, req.user.userId]
        );

        if (existingMember.rows.length > 0) {
            return res.status(200).json({
                message: "You are already a member of this workspace",
                workspace,
            });
        }

        await pool.query(
            `INSERT INTO workspace_members
             (workspace_id, user_id, role)
             VALUES ($1, $2, $3)`,
            [workspace.id, req.user.userId, "member"]
        );

        return res.status(200).json({
            message: "Workspace joined successfully",
            workspace,
        });
    } catch (error) {
        console.error("Join workspace error:", error);

        return res.status(500).json({
            message: "Unable to join workspace",
        });
    }
};



// ==================== EXPORT CONTROLLERS ====================

module.exports = {
    createWorkspace,
    getWorkspaces,
    joinWorkspace
};
