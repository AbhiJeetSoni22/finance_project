const Transaction = require("../models/transaction.model");
const mongoose = require("mongoose");

// ── Helper — Base Match Stage ─────────────────────────────────────────────────
// Builds the $match stage used at the top of every pipeline
// Viewers are scoped to their own data; admins/analysts see everything
const buildMatchStage = (userId, userRole, startDate, endDate) => {
  const match = { isDeleted: false };

  if (userRole === "viewer") {
    match.user = new mongoose.Types.ObjectId(userId);
  }

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate)   match.date.$lte = new Date(endDate);
  }

  return match;
};

// ── 1. Summary ────────────────────────────────────────────────────────────────
// Returns: totalIncome, totalExpenses, netBalance, transactionCount
// All roles — viewers scoped to own data
const getSummary = async (userId, userRole, startDate, endDate) => {
  const match = buildMatchStage(userId, userRole, startDate, endDate);

  const result = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: null, // Group ALL documents into one bucket
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
            // If type is income add amount, else add 0
          },
        },
        totalExpenses: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
          },
        },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalIncome:      { $round: ["$totalIncome", 2] },
        totalExpenses:    { $round: ["$totalExpenses", 2] },
        netBalance:       { $round: [{ $subtract: ["$totalIncome", "$totalExpenses"] }, 2] },
        transactionCount: 1,
      },
    },
  ]);

  // Return zeroed summary if no transactions exist yet
  return result[0] || {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    transactionCount: 0,
  };
};

// ── 2. Category Breakdown ─────────────────────────────────────────────────────
// Returns per-category totals split by income and expense
// Analyst + Admin only — gives spending pattern insights
const getCategoryBreakdown = async (userId, userRole, startDate, endDate) => {
  const match = buildMatchStage(userId, userRole, startDate, endDate);

  const result = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { category: "$category", type: "$type" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        // Re-group by category to nest income/expense under the same category
        _id: "$_id.category",
        breakdown: {
          $push: {
            type:  "$_id.type",
            total: { $round: ["$total", 2] },
            count: "$count",
          },
        },
        categoryTotal: { $sum: "$total" },
      },
    },
    {
      $project: {
        _id: 0,
        category:      "$_id",
        breakdown:     1,
        categoryTotal: { $round: ["$categoryTotal", 2] },
      },
    },
    { $sort: { categoryTotal: -1 } }, // Highest spending categories first
  ]);

  return result;
};

// ── 3. Monthly Trends ─────────────────────────────────────────────────────────
// Returns month-by-month income vs expense for the last N months
// Analyst + Admin only — used for line/bar charts on the dashboard
const getMonthlyTrends = async (userId, userRole, months = 6) => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const match = buildMatchStage(userId, userRole, startDate, null);

  const result = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        // Group by year + month combination
        _id: {
          year:  { $year:  "$date" },
          month: { $month: "$date" },
        },
        totalIncome: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        totalExpenses: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        year:             "$_id.year",
        month:            "$_id.month",
        totalIncome:      { $round: ["$totalIncome", 2] },
        totalExpenses:    { $round: ["$totalExpenses", 2] },
        netBalance:       { $round: [{ $subtract: ["$totalIncome", "$totalExpenses"] }, 2] },
        transactionCount: 1,
      },
    },
    // Sort chronologically so frontend can plot left-to-right without re-sorting
    { $sort: { year: 1, month: 1 } },
  ]);

  return result;
};

// ── 4. Weekly Trends ──────────────────────────────────────────────────────────
// Returns day-by-day breakdown for the last 7 days
// Analyst + Admin only — gives short-term activity view
const getWeeklyTrends = async (userId, userRole) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6); // Last 7 days including today
  startDate.setHours(0, 0, 0, 0);

  const match = buildMatchStage(userId, userRole, startDate, null);

  const result = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year:       { $year:       "$date" },
          month:      { $month:      "$date" },
          dayOfMonth: { $dayOfMonth: "$date" },
          dayOfWeek:  { $dayOfWeek:  "$date" }, // 1=Sun, 2=Mon ... 7=Sat
        },
        totalIncome: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        totalExpenses: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        year:             "$_id.year",
        month:            "$_id.month",
        day:              "$_id.dayOfMonth",
        dayOfWeek:        "$_id.dayOfWeek",
        totalIncome:      { $round: ["$totalIncome", 2] },
        totalExpenses:    { $round: ["$totalExpenses", 2] },
        netBalance:       { $round: [{ $subtract: ["$totalIncome", "$totalExpenses"] }, 2] },
        transactionCount: 1,
      },
    },
    { $sort: { year: 1, month: 1, day: 1 } },
  ]);

  return result;
};

// ── 5. Recent Activity ────────────────────────────────────────────────────────
// Returns the N most recent transactions — all roles
// Viewers scoped to their own, others see system-wide recent activity
const getRecentActivity = async (userId, userRole, limit = 5) => {
  const match = buildMatchStage(userId, userRole, null, null);

  const result = await Transaction.find(match)
    .populate("user", "name email")
    .sort({ date: -1 })
    .limit(Math.min(limit, 20)); // Cap at 20 to avoid heavy payloads

  return result;
};

// ── 6. Top Categories ─────────────────────────────────────────────────────────
// Returns top N spending categories for expense type
// Analyst + Admin only
const getTopCategories = async (userId, userRole, limit = 5, startDate, endDate) => {
  const match = buildMatchStage(userId, userRole, startDate, endDate);
  match.type = "expense"; // Only interested in spending categories

  const result = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id:   "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id:      0,
        category: "$_id",
        total:    { $round: ["$total", 2] },
        count:    1,
      },
    },
    { $sort:  { total: -1 } },
    { $limit: Math.min(limit, 10) },
  ]);

  return result;
};

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
  getTopCategories,
};
