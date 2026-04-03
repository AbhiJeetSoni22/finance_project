require("./setup");
const request = require("supertest");
const app = require("../src/app");
const {
  registerUser,
  loginUser,
  promoteUser,
  createAdminAndLogin,
} = require("./helpers");

describe("👤 Users API", () => {
  let adminToken;
  let viewerToken;
  let viewerUserId;

  beforeEach(async () => {
    adminToken = await createAdminAndLogin();

    const { user } = await registerUser({
      email: "viewer@test.com",
      password: "pass123",
    });
    viewerUserId = user.id;
    const login = await loginUser("viewer@test.com", "pass123");
    viewerToken = login.token;
  });

  // ── Get All Users ─────────────────────────────────────────────────────────
  describe("GET /api/users", () => {

    it("admin should get all users", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.users.length).toBe(2); // admin + viewer
      expect(res.body.data.pagination).toBeDefined();
    });

    it("viewer should NOT access users list", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("should filter users by role", async () => {
      const res = await request(app)
        .get("/api/users?role=viewer")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      res.body.data.users.forEach(u => expect(u.role).toBe("viewer"));
    });

    it("should search users by name", async () => {
      const res = await request(app)
        .get("/api/users?search=viewer")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.users.length).toBeGreaterThan(0);
    });
  });

  // ── Get User By ID ────────────────────────────────────────────────────────
  describe("GET /api/users/:id", () => {

    it("admin should get a user by id", async () => {
      const res = await request(app)
        .get(`/api/users/${viewerUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.email).toBe("viewer@test.com");
    });

    it("should return 404 for non-existent user", async () => {
      const fakeId = "64a1b2c3d4e5f6a7b8c9d0e1";

      const res = await request(app)
        .get(`/api/users/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── Update User ───────────────────────────────────────────────────────────
  describe("PATCH /api/users/:id", () => {

    it("admin should promote viewer to analyst", async () => {
      const res = await request(app)
        .patch(`/api/users/${viewerUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "analyst" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.role).toBe("analyst");
    });

    it("admin should deactivate a user", async () => {
      const res = await request(app)
        .patch(`/api/users/${viewerUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.isActive).toBe(false);
    });

    it("deactivated user should not be able to login", async () => {
      // Deactivate the viewer
      await request(app)
        .patch(`/api/users/${viewerUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      // Try to login
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "viewer@test.com", password: "pass123" });

      expect(res.statusCode).toBe(403);
    });

    it("should return 400 for invalid role value", async () => {
      const res = await request(app)
        .patch(`/api/users/${viewerUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "superadmin" });

      expect(res.statusCode).toBe(400);
    });

    it("admin should NOT be able to modify their own role", async () => {
      // Get admin's own id
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${adminToken}`);
      const adminId = meRes.body.data.user.id;

      const res = await request(app)
        .patch(`/api/users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "viewer" });

      expect(res.statusCode).toBe(400);
    });

    it("viewer should NOT be able to update users", async () => {
      const res = await request(app)
        .patch(`/api/users/${viewerUserId}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ role: "admin" });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── Delete User ───────────────────────────────────────────────────────────
  describe("DELETE /api/users/:id", () => {

    it("admin should delete a user", async () => {
      const res = await request(app)
        .delete(`/api/users/${viewerUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);

      // Verify user is gone
      const getRes = await request(app)
        .get(`/api/users/${viewerUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(getRes.statusCode).toBe(404);
    });

    it("admin should NOT be able to delete themselves", async () => {
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${adminToken}`);
      const adminId = meRes.body.data.user.id;

      const res = await request(app)
        .delete(`/api/users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
    });
  });
});
