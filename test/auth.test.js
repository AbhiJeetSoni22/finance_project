require("./setup");
const request = require("supertest");
const app = require("../src/app");
const { registerUser, loginUser } = require("./helpers");

describe("🔐 Auth API", () => {

  // ── Register ──────────────────────────────────────────────────────────────
  describe("POST /api/auth/register", () => {

    it("should register a new user and return token", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "John Doe", email: "john@test.com", password: "pass123" });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe("viewer"); // Always viewer on register
      expect(res.body.data.user.password).toBeUndefined(); // Password never returned
    });

    it("should return 409 if email already registered", async () => {
      await registerUser({ email: "duplicate@test.com" });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Another", email: "duplicate@test.com", password: "pass123" });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 if name is missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@test.com", password: "pass123" });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 if email is invalid", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Test", email: "not-an-email", password: "pass123" });

      expect(res.statusCode).toBe(400);
    });

    it("should return 400 if password is less than 6 characters", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Test", email: "test@test.com", password: "123" });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe("POST /api/auth/login", () => {

    beforeEach(async () => {
      await registerUser({ email: "login@test.com", password: "pass123" });
    });

    it("should login with correct credentials and return token", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "login@test.com", password: "pass123" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe("login@test.com");
    });

    it("should return 401 for wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "login@test.com", password: "wrongpass" });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 for non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@test.com", password: "pass123" });

      expect(res.statusCode).toBe(401);
    });

    it("should return 400 if email is missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ password: "pass123" });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Get Me ────────────────────────────────────────────────────────────────
  describe("GET /api/auth/me", () => {

    it("should return current user profile with valid token", async () => {
      const { token, user } = await registerUser({ email: "me@test.com" });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.email).toBe("me@test.com");
      expect(res.body.data.user.password).toBeUndefined();
    });

    it("should return 401 with no token", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.statusCode).toBe(401);
    });

    it("should return 401 with invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer this.is.fake");

      expect(res.statusCode).toBe(401);
    });
  });
});
