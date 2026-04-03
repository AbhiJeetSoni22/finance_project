require("./setup");
const request = require("supertest");
const app = require("../src/app");
const {
  registerUser,
  loginUser,
  promoteUser,
  createAdminAndLogin,
  createTransaction,
} = require("./helpers");

describe("💰 Transactions API", () => {
  let adminToken;
  let viewerToken;
  let analystToken;

  // Create one admin, one viewer, one analyst before all tests in this suite
  beforeEach(async () => {
    adminToken = await createAdminAndLogin();

    const { user: viewerUser } = await registerUser({
      email: "viewer@test.com",
      password: "pass123",
    });
    const viewerLogin = await loginUser("viewer@test.com", "pass123");
    viewerToken = viewerLogin.token;

    const { user: analystUser } = await registerUser({
      email: "analyst@test.com",
      password: "pass123",
    });
    await promoteUser(analystUser.id, "analyst");
    const analystLogin = await loginUser("analyst@test.com", "pass123");
    analystToken = analystLogin.token;
  });

  // ── Create ────────────────────────────────────────────────────────────────
  describe("POST /api/transactions", () => {

    it("admin should create a transaction successfully", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          amount: 10000,
          type: "income",
          category: "salary",
          date: "2024-01-15",
          description: "January salary",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.transaction.amount).toBe(10000);
      expect(res.body.data.transaction.type).toBe("income");
    });

    it("viewer should NOT be able to create a transaction", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ amount: 5000, type: "income", category: "salary" });

      expect(res.statusCode).toBe(403);
    });

    it("analyst should NOT be able to create a transaction", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ amount: 5000, type: "income", category: "salary" });

      expect(res.statusCode).toBe(403);
    });

    it("should return 400 for invalid type", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ amount: 5000, type: "invalid_type", category: "salary" });

      expect(res.statusCode).toBe(400);
    });

    it("should return 400 for negative amount", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ amount: -500, type: "income", category: "salary" });

      expect(res.statusCode).toBe(400);
    });

    it("should return 400 for invalid category", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ amount: 500, type: "income", category: "fake_category" });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Read ──────────────────────────────────────────────────────────────────
  describe("GET /api/transactions", () => {

    beforeEach(async () => {
      // Seed some transactions for read tests
      await createTransaction(adminToken, { amount: 50000, type: "income",  category: "salary" });
      await createTransaction(adminToken, { amount: 1200,  type: "expense", category: "rent" });
      await createTransaction(adminToken, { amount: 800,   type: "expense", category: "food" });
    });

    it("admin should get all transactions", async () => {
      const res = await request(app)
        .get("/api/transactions")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.transactions.length).toBe(3);
      expect(res.body.data.pagination).toBeDefined();
    });

    it("analyst should get all transactions", async () => {
      const res = await request(app)
        .get("/api/transactions")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.transactions.length).toBe(3);
    });

    it("viewer should only see their own transactions", async () => {
      const res = await request(app)
        .get("/api/transactions")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      // Viewer created no transactions so should get 0
      expect(res.body.data.transactions.length).toBe(0);
    });

    it("should filter by type=expense", async () => {
      const res = await request(app)
        .get("/api/transactions?type=expense")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.transactions.length).toBe(2);
      res.body.data.transactions.forEach(t => expect(t.type).toBe("expense"));
    });

    it("should filter by category=food", async () => {
      const res = await request(app)
        .get("/api/transactions?category=food")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.transactions.length).toBe(1);
      expect(res.body.data.transactions[0].category).toBe("food");
    });

    it("should paginate correctly", async () => {
      const res = await request(app)
        .get("/api/transactions?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.transactions.length).toBe(2);
      expect(res.body.data.pagination.totalPages).toBe(2);
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/transactions");
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Update ────────────────────────────────────────────────────────────────
  describe("PATCH /api/transactions/:id", () => {

    it("admin should update a transaction", async () => {
      const transaction = await createTransaction(adminToken);

      const res = await request(app)
        .patch(`/api/transactions/${transaction._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ amount: 9999, description: "Updated" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.transaction.amount).toBe(9999);
      expect(res.body.data.transaction.description).toBe("Updated");
    });

    it("viewer should NOT be able to update a transaction", async () => {
      const transaction = await createTransaction(adminToken);

      const res = await request(app)
        .patch(`/api/transactions/${transaction._id}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ amount: 9999 });

      expect(res.statusCode).toBe(403);
    });

    it("should return 404 for non-existent transaction", async () => {
      const fakeId = "64a1b2c3d4e5f6a7b8c9d0e1";

      const res = await request(app)
        .patch(`/api/transactions/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ amount: 100 });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  describe("DELETE /api/transactions/:id", () => {

    it("admin should soft delete a transaction", async () => {
      const transaction = await createTransaction(adminToken);

      const res = await request(app)
        .delete(`/api/transactions/${transaction._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);

      // Verify it no longer appears in list (soft deleted)
      const listRes = await request(app)
        .get("/api/transactions")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(listRes.body.data.transactions.length).toBe(0);
    });

    it("viewer should NOT be able to delete a transaction", async () => {
      const transaction = await createTransaction(adminToken);

      const res = await request(app)
        .delete(`/api/transactions/${transaction._id}`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
