const express = require("express");
const {
  getAllTransactions, getTransactionById,
  createTransaction, updateTransaction, deleteTransaction,
} = require("../controllers/transaction.controller");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");
const { createTransactionValidation, updateTransactionValidation } = require("../validators/transaction.validator");

const router = express.Router();
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Financial records management
 */

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions
 *     description: |
 *       Returns a paginated list of transactions.
 *       - **Admin / Analyst** — sees all transactions
 *       - **Viewer** — sees only their own transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *         description: Filter by transaction type
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category (e.g. salary, food, rent)
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Filter from date (e.g. 2024-01-01)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Filter to date (e.g. 2024-12-31)
 *       - in: query
 *         name: minAmount
 *         schema: { type: number }
 *         description: Minimum amount filter
 *       - in: query
 *         name: maxAmount
 *         schema: { type: number }
 *         description: Maximum amount filter
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: date }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Transactions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Transaction' }
 *                     pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 *   post:
 *     summary: Create a new transaction
 *     description: "**Admin only** — creates a new financial record"
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 5000
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 example: income
 *               category:
 *                 type: string
 *                 example: salary
 *                 description: "One of: salary, freelance, investment, business, food, rent, utilities, transport, healthcare, education, entertainment, shopping, other"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               description:
 *                 type: string
 *                 example: Monthly salary
 *     responses:
 *       201:
 *         description: Transaction created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction: { $ref: '#/components/schemas/Transaction' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden — admin only
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.route("/")
  .get(getAllTransactions)
  .post(authorizeRoles("admin"), createTransactionValidation, createTransaction);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get a transaction by ID
 *     description: Viewers can only access their own transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction: { $ref: '#/components/schemas/Transaction' }
 *       403:
 *         description: Viewer accessing another user's transaction
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 *   patch:
 *     summary: Update a transaction
 *     description: "**Admin only** — partial update, only provided fields are changed"
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:      { type: number,  example: 6000 }
 *               type:        { type: string,  enum: [income, expense] }
 *               category:    { type: string,  example: freelance }
 *               date:        { type: string,  format: date }
 *               description: { type: string,  example: Updated description }
 *     responses:
 *       200:
 *         description: Transaction updated
 *       403:
 *         description: Forbidden — admin only
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 *   delete:
 *     summary: Soft delete a transaction
 *     description: "**Admin only** — marks the record as deleted without removing it from the database"
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *       403:
 *         description: Forbidden — admin only
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.route("/:id")
  .get(getTransactionById)
  .patch(authorizeRoles("admin"), updateTransactionValidation, updateTransaction)
  .delete(authorizeRoles("admin"), deleteTransaction);

module.exports = router;