const express = require("express");
const {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
  getTopCategories,
} = require("../controllers/dashboard.controller");

const { protect, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

// All dashboard routes require authentication
router.use(protect);

// ── Role Matrix ────────────────────────────────────────────────────────────────
// GET /api/dashboard/summary          → all roles   (viewers see own data only)
// GET /api/dashboard/recent           → all roles   (viewers see own data only)
// GET /api/dashboard/categories       → analyst, admin
// GET /api/dashboard/trends/monthly   → analyst, admin
// GET /api/dashboard/trends/weekly    → analyst, admin
// GET /api/dashboard/top-categories   → analyst, admin

router.get("/summary",          getSummary);
router.get("/recent",           getRecentActivity);

// Analyst and Admin only routes
router.get("/categories",       authorizeRoles("analyst", "admin"), getCategoryBreakdown);
router.get("/trends/monthly",   authorizeRoles("analyst", "admin"), getMonthlyTrends);
router.get("/trends/weekly",    authorizeRoles("analyst", "admin"), getWeeklyTrends);
router.get("/top-categories",   authorizeRoles("analyst", "admin"), getTopCategories);

module.exports = router;
