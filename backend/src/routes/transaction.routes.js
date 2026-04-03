const express = require("express");
const {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transaction.controller");

const { protect, authorizeRoles } = require("../middlewares/auth.middleware");
const {
  createTransactionValidation,
  updateTransactionValidation,
} = require("../validators/transaction.validator");

const router = express.Router();

// All transaction routes require a valid JWT — apply protect globally to this router
router.use(protect);

// ── Role Matrix ───────────────────────────────────────────────────────────────
// GET    /api/transactions        → viewer, analyst, admin  (viewers see only their own)
// GET    /api/transactions/:id    → viewer, analyst, admin  (viewers blocked from others')
// POST   /api/transactions        → admin only
// PATCH  /api/transactions/:id    → admin only
// DELETE /api/transactions/:id    → admin only

router
  .route("/")
  .get(getAllTransactions)                                          // All roles
  .post(authorizeRoles("admin"), createTransactionValidation, createTransaction); // Admin only

router
  .route("/:id")
  .get(getTransactionById)                                                        // All roles
  .patch(authorizeRoles("admin"), updateTransactionValidation, updateTransaction) // Admin only
  .delete(authorizeRoles("admin"), deleteTransaction);                            // Admin only

module.exports = router;
