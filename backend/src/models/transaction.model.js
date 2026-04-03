const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // Who created this record — links back to User collection
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Transaction must belong to a user"],
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },

    type: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: {
        values: ["income", "expense"],
        message: "Type must be either income or expense",
      },
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      enum: {
        values: [
          "salary",
          "freelance",
          "investment",
          "business",       // income categories
          "food",
          "rent",
          "utilities",
          "transport",
          "healthcare",
          "education",
          "entertainment",
          "shopping",
          "other",          // expense categories + fallback
        ],
        message: "Invalid category",
      },
    },

    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
      default: "",
    },

    // Soft delete — marks record as deleted without removing from DB
    // This preserves history and allows recovery if needed
    isDeleted: {
      type: Boolean,
      default: false,
      select: false, // Hidden from query results unless explicitly requested
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Compound index on user + date — most queries filter by user and sort by date
transactionSchema.index({ user: 1, date: -1 });
// Index on type and category for fast dashboard aggregations
transactionSchema.index({ type: 1, category: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
