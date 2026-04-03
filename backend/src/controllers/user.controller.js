const { validationResult } = require("express-validator");
const User = require("../models/user.model");
const Transaction = require("../models/transaction.model");
const { AppError } = require("../utils/errorHandler");
const { sendSuccess } = require("../utils/responseFormatter");

// ── GET /api/users ────────────────────────────────────────────────────────────
// Admin only — list all users with optional filters + pagination
const getAllUsers = async (req, res, next) => {
  try {
    const filter = {};

    // Filter by role — ?role=viewer | analyst | admin
    if (req.query.role) {
      filter.role = req.query.role;
    }

    // Filter by status — ?isActive=true | false
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    // Search by name or email — ?search=john
    if (req.query.search) {
      filter.$or = [
        { name:  { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // ── Pagination ────────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 }) // Newest users first
        .skip(skip)
        .limit(limit),
    ]);

    sendSuccess(res, 200, "Users fetched", {
      users,
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

// ── GET /api/users/:id ────────────────────────────────────────────────────────
// Admin only — fetch a single user's profile
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    sendSuccess(res, 200, "User fetched", { user });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/users/:id ──────────────────────────────────────────────────────
// Admin only — update role and/or active status of a user
// Intentionally separated from auth — profile edits go through /auth/me
const updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    // Prevent admin from demoting or deactivating themselves
    if (req.params.id === req.user._id.toString()) {
      return next(new AppError("You cannot modify your own role or status.", 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Only allow updating role and isActive — nothing else from this endpoint
    const { role, isActive } = req.body;

    if (role      !== undefined) user.role     = role;
    if (isActive  !== undefined) user.isActive = isActive;

    await user.save();

    sendSuccess(res, 200, "User updated successfully", {
      user: {
        id:       user._id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
// Admin only — permanently deletes the user AND their transactions
// In a production system this would be a soft delete, but hard delete
// is acceptable here since admin is explicitly removing a user account
const deleteUser = async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return next(new AppError("You cannot delete your own account.", 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Soft-delete all transactions belonging to this user before removing them
    await Transaction.updateMany(
      { user: req.params.id },
      { isDeleted: true }
    );

    await User.findByIdAndDelete(req.params.id);

    sendSuccess(res, 200, "User deleted successfully", {});
  } catch (error) {
    next(error);
  }
};

// ── GET /api/users/:id/transactions ───────────────────────────────────────────
// Admin only — view all transactions belonging to a specific user
// Useful for auditing a particular user's financial activity
const getUserTransactions = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const filter = { user: req.params.id, isDeleted: false };

    // Optional type filter — ?type=income | expense
    if (req.query.type) filter.type = req.query.type;

    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    sendSuccess(res, 200, "User transactions fetched", {
      user: { id: user._id, name: user.name, email: user.email },
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

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserTransactions,
};
