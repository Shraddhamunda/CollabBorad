
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const boardRoutes = require("./routes/boardRoutes");
const boardElementRoutes = require("./routes/boardElementRoutes");

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/boards", boardElementRoutes);

const PORT = 5000;

app.get("/", (req, res) => {
  res.send("CollabBoard Backend is Running!");
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-board", (boardId) => {
    socket.join(`board-${boardId}`);
    console.log(`User joined board: ${boardId}`);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Test PostgreSQL connection
pool.query("SELECT NOW()")
  .then(() => {
    console.log("PostgreSQL connected successfully!");
  })
  .catch((error) => {
    console.error(
      "PostgreSQL connection failed:",
      error.message
    );
  });

// Start HTTP server with Socket.IO
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

