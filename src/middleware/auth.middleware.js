const { verifyToken } = require("../utils/jwt");
const { AppError } = require("../utils/errorHandler");
const User = require("../models/user.model");

// ── protect ───────────────────────────────────────────────────────────────────
// Verifies the JWT on every protected route
// Attaches the full user document to req.user for downstream use
const protect = async (req, res, next) => {
  try {
    // Token must come in the Authorization header as: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Access denied. No token provided.", 401));
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token); // Throws if expired or tampered

    // Re-fetch user from DB to catch deactivated accounts even with a valid token
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError("User no longer exists.", 401));
    }

    if (!user.isActive) {
      return next(new AppError("Your account has been deactivated.", 403));
    }

    req.user = user; // Attach user to request for use in controllers
    next();
  } catch (error) {
    next(error);
  }
};

// ── authorizeRoles ────────────────────────────────────────────────────────────
// Role-based guard — call AFTER protect
// Usage: authorizeRoles("admin")  or  authorizeRoles("admin", "analyst")
// Returns a middleware function that checks req.user.role against allowed roles
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`,
          403
        )
      );
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };