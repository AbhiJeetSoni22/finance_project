const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { errorHandler } = require("./utils/errorHandler");

const app = express();

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Swagger API Docs ──────────────────────────────────────────────────────────
// Available at /api-docs — interactive UI to explore and test all endpoints
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Finance Dashboard API Docs",
  customCss: ".swagger-ui .topbar { background-color: #1a1a2e; }",
  swaggerOptions: {
    persistAuthorization: true, // Keeps the Bearer token across page refreshes
  },
}));

// ── Raw Swagger JSON ──────────────────────────────────────────────────────────
// Useful if reviewers want to import into Postman or Insomnia
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Finance Dashboard API is running",
    docs: "/api-docs",
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",         require("./routes/auth.routes"));
app.use("/api/users",        require("./routes/user.routes"));
app.use("/api/transactions", require("./routes/transaction.routes"));
app.use("/api/dashboard",    require("./routes/dashboard.routes"));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;