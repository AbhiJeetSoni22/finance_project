const express = require("express");
const { errorHandler } = require("./utils/errorHandler");

const app = express();

// ── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json());                          // Parse incoming JSON request bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded form data

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ success: true, message: "Finance Dashboard API is running" });
});

// ── API Routes ────────────────────────────────────────────────────────────────
// Routes will be imported and mounted here as we build each module:
app.use("/api/auth",          require("./routes/auth.routes"));
app.use("/api/users",        require("./routes/user.routes"));
app.use("/api/transactions", require("./routes/transaction.routes"));
app.use("/api/dashboard",    require("./routes/dashboard.routes"));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// Must be registered LAST, after all routes
app.use(errorHandler);

module.exports = app;
