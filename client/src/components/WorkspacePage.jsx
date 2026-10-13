
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
import Whiteboard from "./Whiteboard";

function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBoard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await API.post(
          `/boards/${workspaceId}/default`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setBoard(response.data.board);
      } catch (err) {
        console.error("Load board error:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load board. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadBoard();
  }, [workspaceId]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            CollabBoard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Workspace ID: {workspaceId}
          </p>

          {board && (
            <p className="mt-1 text-sm font-medium text-blue-700">
              Board: {board.name}
            </p>
          )}
        </div>

        <button
          onClick={() => navigate("/")}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to Dashboard
        </button>
      </header>

      {loading ? (
        <div className="rounded-lg bg-white p-6 text-slate-600">
          Loading board...
        </div>
      ) : error ? (
        <div className="rounded-lg bg-white p-6">
          <p className="text-red-600">{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Retry
          </button>
        </div>
      ) : board?.id ? (
        <section className="min-h-[70vh]">
          <Whiteboard
            workspaceId={workspaceId}
            boardId={board.id}
          />
        </section>
      ) : (
        <p className="rounded-lg bg-white p-6 text-slate-600">
          No board was returned for this workspace.
        </p>
      )}
    </main>
  );
}

export default WorkspacePage;
