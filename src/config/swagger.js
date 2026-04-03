const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Finance Dashboard API",
      version: "1.0.0",
      description: `
A RESTful backend API for a finance dashboard system with role-based access control.

## Roles & Permissions
| Role     | Transactions         | Dashboard          | Users        |
|----------|---------------------|--------------------|--------------|
| viewer   | View own only       | Summary + Recent   | ❌           |
| analyst  | View all            | All endpoints      | ❌           |
| admin    | Full CRUD           | All endpoints      | Full CRUD    |

## Authentication
All protected routes require a Bearer token in the Authorization header.
Register or login to get your token, then click **Authorize** and enter: \`Bearer <your_token>\`
      `,
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:5000",
        description: process.env.NODE_ENV === "production" ? "Production Server" : "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        // Defines the JWT Bearer auth scheme used across all protected routes
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token. Get it from /api/auth/login or /api/auth/register",
        },
      },
      schemas: {
        // ── Reusable response schemas ────────────────────────────────────────
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation successful" },
            data:    { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message here" },
          },
        },
        // ── User schema ──────────────────────────────────────────────────────
        User: {
          type: "object",
          properties: {
            id:        { type: "string",  example: "64a1b2c3d4e5f6a7b8c9d0e1" },
            name:      { type: "string",  example: "John Doe" },
            email:     { type: "string",  example: "john@example.com" },
            role:      { type: "string",  enum: ["viewer", "analyst", "admin"], example: "viewer" },
            isActive:  { type: "boolean", example: true },
            createdAt: { type: "string",  format: "date-time" },
          },
        },
        // ── Transaction schema ───────────────────────────────────────────────
        Transaction: {
          type: "object",
          properties: {
            _id:         { type: "string",  example: "64a1b2c3d4e5f6a7b8c9d0e1" },
            user:        { type: "string",  example: "64a1b2c3d4e5f6a7b8c9d0e1" },
            amount:      { type: "number",  example: 5000 },
            type:        { type: "string",  enum: ["income", "expense"], example: "income" },
            category:    { type: "string",  example: "salary" },
            date:        { type: "string",  format: "date-time" },
            description: { type: "string",  example: "Monthly salary" },
            createdAt:   { type: "string",  format: "date-time" },
          },
        },
        // ── Pagination schema ────────────────────────────────────────────────
        Pagination: {
          type: "object",
          properties: {
            total:       { type: "integer", example: 50 },
            page:        { type: "integer", example: 1 },
            limit:       { type: "integer", example: 10 },
            totalPages:  { type: "integer", example: 5 },
            hasNextPage: { type: "boolean", example: true },
          },
        },
        // ── Dashboard summary schema ─────────────────────────────────────────
        Summary: {
          type: "object",
          properties: {
            totalIncome:      { type: "number",  example: 55000 },
            totalExpenses:    { type: "number",  example: 23000 },
            netBalance:       { type: "number",  example: 32000 },
            transactionCount: { type: "integer", example: 42 },
          },
        },
      },
    },
  },
  // Tell swagger-jsdoc where to find JSDoc comments for routes
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;