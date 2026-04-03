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

describe("📊 Dashboard API", () => {
  let adminToken;
  let analystToken;
  let viewerToken;

  beforeEach(async () => {
    // Setup all 3 role types
    adminToken = await createAdminAndLogin();

    const { user: analystUser } = await registerUser({
      email: "analyst@test.com",
      password: "pass123",
    });
    await promoteUser(analystUser.id, "analyst");
    const analystLogin = await loginUser("analyst@test.com", "pass123");
    analystToken = analystLogin.token;

    await registerUser({ email: "viewer@test.com", password: "pass123" });
    const viewerLogin = await loginUser("viewer@test.com", "pass123");
    viewerToken = viewerLogin.token;

    // Seed transactions for analytics
    await createTransaction(adminToken, { amount: 50000, type: "income",  category: "salary",  date: "2024-01-15" });
    await createTransaction(adminToken, { amount: 5000,  type: "income",  category: "freelance", date: "2024-01-20" });
    await createTransaction(adminToken, { amount: 1200,  type: "expense", category: "rent",    date: "2024-01-10" });
    await createTransaction(adminToken, { amount: 800,   type: "expense", category: "food",    date: "2024-01-25" });
    await createTransaction(adminToken, { amount: 300,   type: "expense", category: "transport", date: "2024-01-28" });
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  describe("GET /api/dashboard/summary", () => {

    it("admin should get correct summary totals", async () => {
      const res = await request(app)
        .get("/api/dashboard/summary")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.summary.totalIncome).toBe(55000);
      expect(res.body.data.summary.totalExpenses).toBe(2300);
      expect(res.body.data.summary.netBalance).toBe(52700);
      expect(res.body.data.summary.transactionCount).toBe(5);
    });

    it("viewer should get summary (scoped to own data)", async () => {
      const res = await request(app)
        .get("/api/dashboard/summary")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      // Viewer has no transactions so everything should be 0
      expect(res.body.data.summary.totalIncome).toBe(0);
      expect(res.body.data.summary.netBalance).toBe(0);
    });

    it("analyst should get full summary", async () => {
      const res = await request(app)
        .get("/api/dashboard/summary")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.summary.transactionCount).toBe(5);
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/dashboard/summary");
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Recent Activity ───────────────────────────────────────────────────────
  describe("GET /api/dashboard/recent", () => {

    it("should return recent transactions with default limit of 5", async () => {
      const res = await request(app)
        .get("/api/dashboard/recent")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.recent.length).toBe(5);
    });

    it("should respect custom limit", async () => {
      const res = await request(app)
        .get("/api/dashboard/recent?limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.recent.length).toBe(2);
    });

    it("viewer can access recent (sees own data only)", async () => {
      const res = await request(app)
        .get("/api/dashboard/recent")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.recent.length).toBe(0); // viewer has no transactions
    });
  });

  // ── Category Breakdown ────────────────────────────────────────────────────
  describe("GET /api/dashboard/categories", () => {

    it("analyst should get category breakdown", async () => {
      const res = await request(app)
        .get("/api/dashboard/categories")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.categories.length).toBeGreaterThan(0);
      // Each category should have breakdown and categoryTotal
      res.body.data.categories.forEach(c => {
        expect(c.category).toBeDefined();
        expect(c.categoryTotal).toBeDefined();
        expect(c.breakdown).toBeDefined();
      });
    });

    it("admin should get category breakdown", async () => {
      const res = await request(app)
        .get("/api/dashboard/categories")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    it("viewer should NOT access category breakdown", async () => {
      const res = await request(app)
        .get("/api/dashboard/categories")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── Monthly Trends ────────────────────────────────────────────────────────
  describe("GET /api/dashboard/trends/monthly", () => {

    it("analyst should get monthly trends", async () => {
      const res = await request(app)
        .get("/api/dashboard/trends/monthly?months=6")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.trends)).toBe(true);
      // Each trend entry should have required fields
      if (res.body.data.trends.length > 0) {
        const trend = res.body.data.trends[0];
        expect(trend.year).toBeDefined();
        expect(trend.month).toBeDefined();
        expect(trend.totalIncome).toBeDefined();
        expect(trend.totalExpenses).toBeDefined();
        expect(trend.netBalance).toBeDefined();
      }
    });

    it("viewer should NOT access monthly trends", async () => {
      const res = await request(app)
        .get("/api/dashboard/trends/monthly")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── Weekly Trends ─────────────────────────────────────────────────────────
  describe("GET /api/dashboard/trends/weekly", () => {

    it("analyst should get weekly trends", async () => {
      const res = await request(app)
        .get("/api/dashboard/trends/weekly")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.trends)).toBe(true);
    });

    it("viewer should NOT access weekly trends", async () => {
      const res = await request(app)
        .get("/api/dashboard/trends/weekly")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── Top Categories ────────────────────────────────────────────────────────
  describe("GET /api/dashboard/top-categories", () => {

    it("analyst should get top spending categories", async () => {
      const res = await request(app)
        .get("/api/dashboard/top-categories?limit=3")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.topCategories.length).toBeLessThanOrEqual(3);
      // Should be sorted by total descending
      const totals = res.body.data.topCategories.map(c => c.total);
      expect(totals).toEqual([...totals].sort((a, b) => b - a));
    });

    it("viewer should NOT access top categories", async () => {
      const res = await request(app)
        .get("/api/dashboard/top-categories")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
