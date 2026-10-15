import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../api/axios";

function Dashboard() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      setError("");

      const token = localStorage.getItem("token");

      const response = await API.get("/workspaces", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setWorkspaces(response.data.workspaces);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load workspaces. Please log in again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();

    if (!workspaceName.trim()) {
      setError("Please enter a workspace name.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await API.post(
        "/workspaces",
        { name: workspaceName.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setWorkspaces((prev) => [response.data.workspace, ...prev]);

      setWorkspaceName("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create workspace.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinWorkspace = async (e) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      setError("Please enter an invite code.");
      return;
    }

    try {
      setJoining(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await API.post(
        "/workspaces/join",
        { inviteCode: inviteCode.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setInviteCode("");

      // Refresh the workspace list after joining.
      await fetchWorkspaces();

      // Open the workspace for both new and existing members.
      navigate(`/workspace/${response.data.workspace.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to join workspace.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="text-sm font-semibold text-blue-600">COLLABBOARD</p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Your Workspaces
          </h1>

          <p className="mt-2 text-slate-600">
            Create a workspace and collaborate with your team.
          </p>
        </header>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Create a workspace
          </h2>

          <form
            onSubmit={handleCreateWorkspace}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Enter workspace name"
              maxLength={100}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Workspace"}
            </button>
          </form>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-slate-900">
            Join a workspace
          </h2>

          <p className="mb-4 text-sm text-slate-600">
            Enter an invite code shared by your teammate.
          </p>

          <form
            onSubmit={handleJoinWorkspace}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code (e.g. CB-A1B2C3D4)"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={joining}
              className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {joining ? "Joining..." : "Join Workspace"}
            </button>
          </form>
        </section>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-lg bg-red-50 p-4 text-red-700"
          >
            {error}
          </p>
        )}

        <section>
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Your projects
          </h2>

          {loading ? (
            <p className="text-slate-600">Loading workspaces...</p>
          ) : workspaces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="font-medium text-slate-800">No workspaces yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Create your first workspace to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <article
                  key={workspace.id}
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700">
                    {workspace.name.charAt(0).toUpperCase()}
                  </div>

                  <h3 className="break-words text-lg font-semibold text-slate-900">
                    {workspace.name}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Role: {workspace.role || "Member"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Created{" "}
                    {new Date(workspace.created_at).toLocaleDateString()}
                  </p>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-slate-500">
                      Invite Code
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                        {workspace.invite_code || "No code available"}
                      </code>

                      <button
                        type="button"
                        disabled={!workspace.invite_code}
                        onClick={async (e) => {
                          e.stopPropagation();

                          try {
                            await navigator.clipboard.writeText(
                              workspace.invite_code,
                            );
                            alert("Invite code copied!");
                          } catch {
                            alert("Unable to copy invite code.");
                          }
                        }}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
