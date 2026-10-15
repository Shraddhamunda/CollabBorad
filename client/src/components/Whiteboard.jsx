
import { useCallback, useEffect, useRef, useState } from "react";
import API from "../api/axios";

function Whiteboard({ workspaceId, boardId }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const currentElementRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#2563eb");
  const [brushSize, setBrushSize] = useState(4);

  const [elements, setElements] = useState([]);
  const [draft, setDraft] = useState(null);

  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const updateHistoryButtons = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(
      historyIndexRef.current < historyRef.current.length - 1
    );
  };

  const recordHistory = (nextElements) => {
    const nextHistory = historyRef.current.slice(
      0,
      historyIndexRef.current + 1
    );

    nextHistory.push([...nextElements]);
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;

    updateHistoryButtons();
  };

  // Render a single element.
  const renderElement = (ctx, element) => {
    const type = element.element_type;
    const x = Number(element.x) || 0;
    const y = Number(element.y) || 0;
    const width = Number(element.width) || 0;
    const height = Number(element.height) || 0;
    const strokeColor = element.stroke_color || "#2563eb";
    const strokeWidth = Number(element.stroke_width) || 4;

    ctx.save();
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;

    ctx.globalCompositeOperation =
      type === "eraser" ? "destination-out" : "source-over";

    if (type === "pen" || type === "eraser") {
      const points = Array.isArray(element.points)
        ? element.points
        : [];

      if (points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        if (points.length === 1) {
          ctx.lineTo(points[0].x + 0.1, points[0].y + 0.1);
        } else {
          points.slice(1).forEach((point) => {
            ctx.lineTo(point.x, point.y);
          });
        }

        ctx.stroke();
      }
    } else if (type === "rectangle") {
      ctx.strokeRect(x, y, width, height);
    } else if (type === "circle") {
      const radius = Math.sqrt(width * width + height * height);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === "line") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      ctx.stroke();
    } else if (type === "text") {
      ctx.font = `${Math.max(16, strokeWidth * 6)}px Arial`;
      ctx.textBaseline = "top";
      ctx.fillText(element.text_content || "", x, y);
    }

    ctx.restore();
  };

  // Redraw the canvas from the current elements.
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    elements.forEach((element) => renderElement(ctx, element));

    if (draft) {
      renderElement(ctx, draft);
    }
  }, [elements, draft]);

  // Set canvas resolution for sharp rendering.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [redrawCanvas]);

  // Load the saved drawing when the board opens.
  useEffect(() => {
    if (!boardId) {
      setLoading(false);
      setError("Board ID is missing. Please reopen the workspace.");
      return;
    }

    let cancelled = false;

    const loadElements = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await API.get(
          `/boards/${boardId}/elements`,
          { headers: getAuthHeaders() }
        );

        if (cancelled) return;

        const savedElements = response.data.elements || [];

        setElements(savedElements);
        historyRef.current = [[...savedElements]];
        historyIndexRef.current = 0;
        updateHistoryButtons();
      } catch (err) {
        if (cancelled) return;

        console.error("Load drawings error:", err);
        setError(
          err.response?.data?.message ||
            "Could not load drawings from the server."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadElements();

    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getPosition = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  // Add a completed element locally. No database request here.
  const addElementLocally = (element) => {
    const nextElements = [...elements, element];

    setElements(nextElements);
    recordHistory(nextElements);
  };

  // Save the complete canvas with one API request.
  const saveDrawing = async () => {
    if (!boardId || loading || saving || isDrawing.current) return;

    setSaving(true);
    setError("");

    try {
      await API.put(
        `/boards/${boardId}/elements/save`,
        { elements },
        { headers: getAuthHeaders() }
      );

      setError("");
    } catch (err) {
      console.error("Save drawing error:", err);
      setError(
        err.response?.data?.message ||
          "Could not save the drawing. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Begin drawing a stroke or shape.
  const startDrawing = (event) => {
    if (loading || saving || !boardId || tool === "text") return;

    event.preventDefault();

    const position = getPosition(event);
    isDrawing.current = true;

    const isFreehand = tool === "pen" || tool === "eraser";

    currentElementRef.current = {
      element_type: tool,
      x: position.x,
      y: position.y,
      width: 0,
      height: 0,
      points: isFreehand ? [position] : null,
      text_content: null,
      stroke_color: color,
      stroke_width: Number(brushSize),
    };

    setDraft(currentElementRef.current);

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  // Update the current stroke or shape.
  const continueDrawing = (event) => {
    if (!isDrawing.current || !currentElementRef.current) return;

    const position = getPosition(event);
    const current = currentElementRef.current;

    if (
      current.element_type === "pen" ||
      current.element_type === "eraser"
    ) {
      currentElementRef.current = {
        ...current,
        points: [...current.points, position],
      };
    } else {
      currentElementRef.current = {
        ...current,
        width: position.x - current.x,
        height: position.y - current.y,
      };
    }

    setDraft({ ...currentElementRef.current });
  };

  // Finish drawing locally. No database request per stroke.
  const stopDrawing = (event) => {
    if (!isDrawing.current) return;

    isDrawing.current = false;

    const element = currentElementRef.current;
    currentElementRef.current = null;
    setDraft(null);

    if (
      event?.currentTarget?.hasPointerCapture?.(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!element) return;

    const hasPoints =
      Array.isArray(element.points) && element.points.length > 0;

    const isShape = [
      "rectangle",
      "circle",
      "line",
    ].includes(element.element_type);

    if (
      hasPoints ||
      (isShape && (element.width !== 0 || element.height !== 0))
    ) {
      addElementLocally(element);
    }
  };

  const placeText = (event) => {
    if (tool !== "text" || loading || saving) return;

    setTextPosition(getPosition(event));
    setTextInput("");
  };

  // Add text locally. Save Drawing persists it.
  const addTextToCanvas = () => {
    if (!textInput.trim() || !textPosition || !boardId) return;

    const element = {
      element_type: "text",
      x: textPosition.x,
      y: textPosition.y,
      width: 0,
      height: 0,
      points: null,
      text_content: textInput.trim(),
      stroke_color: color,
      stroke_width: Number(brushSize),
    };

    addElementLocally(element);

    setTextInput("");
    setTextPosition(null);
  };

  const undo = () => {
    if (historyIndexRef.current <= 0) return;

    historyIndexRef.current -= 1;

    setElements([
      ...historyRef.current[historyIndexRef.current],
    ]);

    updateHistoryButtons();
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      return;
    }

    historyIndexRef.current += 1;

    setElements([
      ...historyRef.current[historyIndexRef.current],
    ]);

    updateHistoryButtons();
  };

  // Clear the saved canvas as well as the local canvas.
  const clearCanvas = async () => {
    if (!boardId || loading || saving) return;

    if (!window.confirm("Clear the canvas for everyone using this board?")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await API.delete(
        `/boards/${boardId}/elements/clear`,
        { headers: getAuthHeaders() }
      );

      setElements([]);
      setDraft(null);
      currentElementRef.current = null;
      isDrawing.current = false;

      historyRef.current = [[]];
      historyIndexRef.current = 0;
      updateHistoryButtons();

      setTextInput("");
      setTextPosition(null);
    } catch (err) {
      console.error("Clear canvas error:", err);
      setError(
        err.response?.data?.message ||
          "Could not clear the saved canvas. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Tool
          <select
            value={tool}
            onChange={(event) => {
              setTool(event.target.value);
              setTextPosition(null);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option value="pen">Pen</option>
            <option value="eraser">Eraser</option>
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="line">Straight Line</option>
            <option value="text">Text</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Color
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-9 w-10 cursor-pointer rounded border border-slate-300"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Size
          <select
            value={brushSize}
            onChange={(event) => setBrushSize(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option value={2}>Small</option>
            <option value={4}>Medium</option>
            <option value={7}>Large</option>
            <option value={10}>Extra Large</option>
          </select>
        </label>

        <button
          type="button"
          onClick={undo}
          disabled={!canUndo || loading || saving}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
        >
          Undo
        </button>

        <button
          type="button"
          onClick={redo}
          disabled={!canRedo || loading || saving}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
        >
          Redo
        </button>

        <button
          type="button"
          onClick={saveDrawing}
          disabled={loading || saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Drawing"}
        </button>

        <button
          type="button"
          onClick={clearCanvas}
          disabled={loading || saving}
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          Clear Canvas
        </button>
      </div>

      {tool === "text" && textPosition && (
        <form
          className="flex flex-wrap gap-2 border-b border-slate-200 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            addTextToCanvas();
          }}
        >
          <input
            type="text"
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            placeholder="Type your text..."
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Add Text
          </button>

          <button
            type="button"
            onClick={() => {
              setTextInput("");
              setTextPosition(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            Cancel
          </button>
        </form>
      )}

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-slate-50 p-3">
        <canvas
          ref={canvasRef}
          className={`h-[65vh] min-h-[400px] w-full touch-none rounded-lg border border-slate-200 bg-white ${
            tool === "text" ? "cursor-text" : "cursor-crosshair"
          }`}
          onPointerDown={(event) => {
            if (tool === "text") {
              placeText(event);
            } else {
              startDrawing(event);
            }
          }}
          onPointerMove={continueDrawing}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4 text-xs text-slate-500">
        <span>
          {loading
            ? "Loading saved drawings..."
            : saving
              ? "Saving drawing..."
              : "Board ready"}
        </span>

        <span>
          Workspace: {workspaceId || "Unknown"} · Board: {boardId || "Unknown"}
        </span>
      </div>
    </div>
  );
}

export default Whiteboard;
