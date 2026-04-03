const express = require("express");
const {
  getSummary, getCategoryBreakdown, getMonthlyTrends,
  getWeeklyTrends, getRecentActivity, getTopCategories,
} = require("../controllers/dashboard.controller");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Analytics and summary endpoints
 */

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Get financial summary
 *     description: |
 *       Returns total income, expenses, net balance, and transaction count.
 *       - Viewers see only their own data
 *       - Analysts and Admins see system-wide data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: Summary fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary: { $ref: '#/components/schemas/Summary' }
 */
router.get("/summary", getSummary);

/**
 * @swagger
 * /api/dashboard/recent:
 *   get:
 *     summary: Get recent transactions
 *     description: Returns the N most recent transactions. Viewers see only their own.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5 }
 *         description: Number of recent transactions (max 20)
 *     responses:
 *       200:
 *         description: Recent activity fetched
 */
router.get("/recent", getRecentActivity);

/**
 * @swagger
 * /api/dashboard/categories:
 *   get:
 *     summary: Get category breakdown
 *     description: "**Analyst + Admin** — returns per-category totals split by income and expense, sorted by highest total"
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Category breakdown fetched
 *       403:
 *         description: Viewer access denied
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/categories", authorizeRoles("analyst", "admin"), getCategoryBreakdown);

/**
 * @swagger
 * /api/dashboard/trends/monthly:
 *   get:
 *     summary: Get monthly income vs expense trends
 *     description: "**Analyst + Admin** — returns month-by-month breakdown for the last N months"
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6 }
 *         description: Number of months to look back (max 24)
 *     responses:
 *       200:
 *         description: Monthly trends fetched
 *       403:
 *         description: Viewer access denied
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/trends/monthly", authorizeRoles("analyst", "admin"), getMonthlyTrends);

/**
 * @swagger
 * /api/dashboard/trends/weekly:
 *   get:
 *     summary: Get weekly trends (last 7 days)
 *     description: "**Analyst + Admin** — day-by-day breakdown of income and expenses for the past week"
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly trends fetched
 *       403:
 *         description: Viewer access denied
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/trends/weekly", authorizeRoles("analyst", "admin"), getWeeklyTrends);

/**
 * @swagger
 * /api/dashboard/top-categories:
 *   get:
 *     summary: Get top spending categories
 *     description: "**Analyst + Admin** — returns the top N expense categories sorted by total amount"
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5 }
 *         description: Number of top categories (max 10)
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Top categories fetched
 *       403:
 *         description: Viewer access denied
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/top-categories", authorizeRoles("analyst", "admin"), getTopCategories);

module.exports = router;