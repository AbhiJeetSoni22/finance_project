const jwt = require("jsonwebtoken");

// Generate a signed JWT containing user id and role
// Role is embedded in token so middleware can check it without a DB call
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// Verify and decode a JWT — throws if invalid or expired
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };