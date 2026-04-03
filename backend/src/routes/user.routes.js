const express = require("express");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserTransactions,
} = require("../controllers/user.controller");

const { protect, authorizeRoles } = require("../middleware/auth.middleware");
const { updateUserValidation } = require("../validators/user.validator");

const router = express.Router();

// All user management routes require a valid JWT + admin role
// Applying both middleware globally to this router keeps individual routes clean
router.use(protect);
router.use(authorizeRoles("admin"));

// ── Routes ─────────────────────────────────────────────────────────────────────
// GET    /api/users                       → list all users (filter + paginate)
// GET    /api/users/:id                   → get single user
// PATCH  /api/users/:id                   → update role or status
// DELETE /api/users/:id                   → permanently delete user
// GET    /api/users/:id/transactions      → view all transactions of a user

router.route("/").get(getAllUsers);

router
  .route("/:id")
  .get(getUserById)
  .patch(updateUserValidation, updateUser)
  .delete(deleteUser);

router.route("/:id/transactions").get(getUserTransactions);

module.exports = router;
