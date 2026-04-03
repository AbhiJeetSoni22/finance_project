const express = require("express");
const { body } = require("express-validator");
const { register, login, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// ── Validation Chains ─────────────────────────────────────────────────────────
// Defined here so they sit alongside their routes — easy to see what each endpoint expects

const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email"),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email"),

  body("password")
    .notEmpty().withMessage("Password is required"),
];

// ── Routes ─────────────────────────────────────────────────────────────────────
router.post("/register", registerValidation, register);
router.post("/login",    loginValidation,    login);
router.get("/me",        protect,            getMe);  // Protected — needs valid JWT

module.exports = router;