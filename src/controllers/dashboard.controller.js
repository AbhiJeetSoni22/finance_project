const dashboardService = require("../services/dashboard.service");
const { AppError } = require("../utils/errorHandler");
const { sendSuccess } = require("../utils/responseFormatter");

// ── GET /api/dashboard/summary ────────────────────────────────────────────────
// All roles — viewers see their own data, analysts/admins see system-wide
// Optional: ?startDate=2024-01-01&endDate=2024-12-31
const getSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await dashboardService.getSummary(
      req.user._id,
      req.user.role,
      startDate,
      endDate
    );

    sendSuccess(res, 200, "Dashboard summary fetched", { summary });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/dashboard/categories ────────────────────────────────────────────
// Analyst + Admin only
// Optional: ?startDate= &endDate=
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const categories = await dashboardService.getCategoryBreakdown(
      req.user._id,
      req.user.role,
      startDate,
      endDate
    );

    sendSuccess(res, 200, "Category breakdown fetched", { categories });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/dashboard/trends/monthly ─────────────────────────────────────────
// Analyst + Admin only
// Optional: ?months=6 (default 6, max sensibly 24)
const getMonthlyTrends = async (req, res, next) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 24);

    const trends = await dashboardService.getMonthlyTrends(
      req.user._id,
      req.user.role,
      months
    );

    sendSuccess(res, 200, "Monthly trends fetched", { trends });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/dashboard/trends/weekly ──────────────────────────────────────────
// Analyst + Admin only — last 7 days
const getWeeklyTrends = async (req, res, next) => {
  try {
    const trends = await dashboardService.getWeeklyTrends(
      req.user._id,
      req.user.role
    );

    sendSuccess(res, 200, "Weekly trends fetched", { trends });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/dashboard/recent ─────────────────────────────────────────────────
// All roles — viewers see their own recent, others see system-wide
// Optional: ?limit=5 (default 5, max 20)
const getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const recent = await dashboardService.getRecentActivity(
      req.user._id,
      req.user.role,
      limit
    );

    sendSuccess(res, 200, "Recent activity fetched", { recent });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/dashboard/top-categories ─────────────────────────────────────────
// Analyst + Admin only
// Optional: ?limit=5 &startDate= &endDate=
const getTopCategories = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const limit = parseInt(req.query.limit) || 5;

    const topCategories = await dashboardService.getTopCategories(
      req.user._id,
      req.user.role,
      limit,
      startDate,
      endDate
    );

    sendSuccess(res, 200, "Top categories fetched", { topCategories });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
  getTopCategories,
};
