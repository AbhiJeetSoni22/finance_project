const { validationResult } = require("express-validator");
const Transaction = require("../models/transaction.model");
const { AppError } = require("../utils/errorHandler");
const { sendSuccess } = require("../utils/responseFormatter");

// ── Helper — Build Filter Object ──────────────────────────────────────────────
// Constructs a MongoDB query filter from incoming query params
// Keeps controller actions clean by centralizing filter logic
const buildFilter = (query, userId, userRole) => {
  const filter = { isDeleted: false };

  // Admins and analysts can see all transactions; viewers only see their own
  if (userRole === "viewer") {
    filter.user = userId;
  }

  if (query.type)     filter.type     = query.type;
  if (query.category) filter.category = query.category;

  // Date range filter — supports ?startDate=2024-01-01&endDate=2024-12-31
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate)   filter.date.$lte = new Date(query.endDate);
  }

  // Amount range filter — supports ?minAmount=100&maxAmount=5000
  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) filter.amount.$gte = Number(query.minAmount);
    if (query.maxAmount) filter.amount.$lte = Number(query.maxAmount);
  }

  return filter;
};

// ── GET /api/transactions ─────────────────────────────────────────────────────
// All roles can access — viewers see only their own, others see all
// Supports: ?type= &category= &startDate= &endDate= &minAmount= &maxAmount=
//           &page= &limit= &sortBy= &order=
const getAllTransactions = async (req, res, next) => {
  try {
    const filter = buildFilter(req.query, req.user._id, req.user.role);

    // ── Pagination ──────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10); // Cap at 100 per page
    const skip  = (page - 1) * limit;

    // ── Sorting ─────────────────────────────────────────────────────────────
    const sortField = req.query.sortBy || "date";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    // Run count and data query in parallel for efficiency
    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter)
        .populate("user", "name email role") // Replace user ObjectId with name+email
        .sort(sort)
        .skip(skip)
        .limit(limit),
    ]);

    sendSuccess(res, 200, "Transactions fetched", {
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/transactions/:id ─────────────────────────────────────────────────
// All roles can access — viewers can only fetch their own transaction
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("user", "name email role");

    if (!transaction) {
      return next(new AppError("Transaction not found", 404));
    }

    // Viewer trying to access someone else's transaction
    if (
      req.user.role === "viewer" &&
      transaction.user._id.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Access denied. Not your transaction.", 403));
    }

    sendSuccess(res, 200, "Transaction fetched", { transaction });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/transactions ────────────────────────────────────────────────────
// Admin only — viewers and analysts cannot create records
const createTransaction = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { amount, type, category, date, description } = req.body;

    const transaction = await Transaction.create({
      user: req.user._id, // Always set to the logged-in admin
      amount,
      type,
      category,
      date: date || Date.now(),
      description,
    });

    sendSuccess(res, 201, "Transaction created", { transaction });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/transactions/:id ───────────────────────────────────────────────
// Admin only — partial update, only provided fields are changed
const updateTransaction = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!transaction) {
      return next(new AppError("Transaction not found", 404));
    }

    const allowedFields = ["amount", "type", "category", "date", "description"];

    // Only update fields that were actually sent in the request body
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        transaction[field] = req.body[field];
      }
    });

    await transaction.save(); // Triggers schema validation on save

    sendSuccess(res, 200, "Transaction updated", { transaction });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/transactions/:id ──────────────────────────────────────────────
// Admin only — soft delete (sets isDeleted: true instead of removing the document)
// Preserves financial history and audit trail
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!transaction) {
      return next(new AppError("Transaction not found", 404));
    }

    transaction.isDeleted = true;
    await transaction.save();

    sendSuccess(res, 200, "Transaction deleted successfully", {});
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
