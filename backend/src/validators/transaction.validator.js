const { body } = require("express-validator");

const VALID_CATEGORIES = [
  "salary", "freelance", "investment", "business",
  "food", "rent", "utilities", "transport",
  "healthcare", "education", "entertainment", "shopping", "other",
];

const VALID_TYPES = ["income", "expense"];

// Full validation — used on POST (create)
const createTransactionValidation = [
  body("amount")
    .notEmpty().withMessage("Amount is required")
    .isFloat({ min: 0.01 }).withMessage("Amount must be a positive number"),

  body("type")
    .notEmpty().withMessage("Type is required")
    .isIn(VALID_TYPES).withMessage("Type must be income or expense"),

  body("category")
    .notEmpty().withMessage("Category is required")
    .isIn(VALID_CATEGORIES).withMessage(`Category must be one of: ${VALID_CATEGORIES.join(", ")}`),

  body("date")
    .optional()
    .isISO8601().withMessage("Date must be a valid ISO 8601 date (e.g. 2024-01-15)"),

  body("description")
    .optional()
    .isLength({ max: 300 }).withMessage("Description cannot exceed 300 characters"),
];

// Partial validation — used on PATCH (update), all fields optional but validated if present
const updateTransactionValidation = [
  body("amount")
    .optional()
    .isFloat({ min: 0.01 }).withMessage("Amount must be a positive number"),

  body("type")
    .optional()
    .isIn(VALID_TYPES).withMessage("Type must be income or expense"),

  body("category")
    .optional()
    .isIn(VALID_CATEGORIES).withMessage(`Category must be one of: ${VALID_CATEGORIES.join(", ")}`),

  body("date")
    .optional()
    .isISO8601().withMessage("Date must be a valid ISO 8601 date"),

  body("description")
    .optional()
    .isLength({ max: 300 }).withMessage("Description cannot exceed 300 characters"),
];

module.exports = { createTransactionValidation, updateTransactionValidation };
