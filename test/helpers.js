const request = require("supertest");
const app = require("../src/app");

// Register a user and return token + user data
// Role is always viewer on register — use promoteUser to elevate
const registerUser = async (data = {}) => {
  const defaults = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  };
  const res = await request(app)
    .post("/api/auth/register")
    .send({ ...defaults, ...data });
  return res.body.data;
};

// Login and return token + user data
const loginUser = async (email, password) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return res.body.data;
};

// Directly update a user's role in DB — simulates admin promotion
const promoteUser = async (userId, role) => {
  const User = require("../src/models/user.model");
  await User.findByIdAndUpdate(userId, { role });
};

// Create an admin user and return their token — used across all admin tests
const createAdminAndLogin = async () => {
  const { user } = await registerUser({
    name: "Admin",
    email: "admin@test.com",
    password: "admin123",
  });
  await promoteUser(user.id, "admin");
  const { token } = await loginUser("admin@test.com", "admin123");
  return token;
};

// Create a transaction via API — requires admin token
const createTransaction = async (token, data = {}) => {
  const defaults = {
    amount: 5000,
    type: "income",
    category: "salary",
    date: "2024-01-15",
    description: "Test transaction",
  };
  const res = await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({ ...defaults, ...data });
  return res.body.data?.transaction;
};

module.exports = {
  registerUser,
  loginUser,
  promoteUser,
  createAdminAndLogin,
  createTransaction,
};
