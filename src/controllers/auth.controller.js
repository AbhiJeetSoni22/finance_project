const { validationResult } = require("express-validator");
const User = require("../models/user.model");
const { generateToken } = require("../utils/jwt");
const { AppError } = require("../utils/errorHandler");
const { sendSuccess } = require("../utils/responseFormatter");

// ── Register ──────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Public — anyone can create a viewer account
// Only admins can assign elevated roles (handled via user management routes)
const register = async (req, res, next) => {
  try {
    // Check express-validator results from the route-level validation chain
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { name, email, password } = req.body;

    // Check if email already taken before trying to insert
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("Email already registered", 409));
    }

    // Role is always "viewer" on self-registration — admins promote via PATCH /users/:id
    const user = await User.create({ name, email, password, role: "viewer" });

    const token = generateToken(user._id, user.role);

    sendSuccess(res, 201, "Registration successful", {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Public — returns JWT on valid credentials
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { email, password } = req.body;

    // Explicitly select password since schema has select: false
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      // Use a generic message — don't reveal whether email exists or not
      return next(new AppError("Invalid email or password", 401));
    }

    // Check if admin has deactivated this account
    if (!user.isActive) {
      return next(new AppError("Your account has been deactivated. Contact an admin.", 403));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError("Invalid email or password", 401));
    }

    const token = generateToken(user._id, user.role);

    sendSuccess(res, 200, "Login successful", {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get Current User ──────────────────────────────────────────────────────────
// GET /api/auth/me
// Protected — returns logged-in user's profile from the token
const getMe = async (req, res, next) => {
  try {
    // req.user is attached by the protect middleware in the next step
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    sendSuccess(res, 200, "User profile fetched", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };