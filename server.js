require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// --- Middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "5mb" }));

// --- Serve the frontend (public folder) ---
app.use(express.static(path.join(__dirname, "public")));

// --- API Routes ---
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/comments", require("./routes/comments"));

// Simple health check for the API.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Vibe API is running" });
});

// Any non-API route falls back to the frontend so the app loads.
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// --- Start ---
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
