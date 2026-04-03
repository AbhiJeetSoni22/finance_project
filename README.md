# Finance Dashboard Backend

A RESTful backend API for a finance dashboard system with role-based access control, financial record management, and aggregated analytics.

Built with **Node.js**, **Express**, **MongoDB**, and **JWT authentication**.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Roles & Permissions](#roles--permissions)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Transactions](#transactions)
  - [Users](#users)
  - [Dashboard](#dashboard)
- [Design Decisions](#design-decisions)
- [Assumptions](#assumptions)
- [Error Handling](#error-handling)

---

## Tech Stack

| Layer        | Technology              |
|--------------|-------------------------|
| Runtime      | Node.js                 |
| Framework    | Express.js              |
| Database     | MongoDB via Mongoose    |
| Auth         | JSON Web Tokens (JWT)   |
| Passwords    | bcryptjs                |
| Validation   | express-validator       |
| Dev Server   | nodemon                 |

---

## Project Structure

```
finance_project/
├── package.json
├── README.md
├── render.yaml                      # Deployment configuration
├── server.js                        # Entry point — loads env, connects DB, starts server
├── src/
│   ├── app.js                       # Express app setup, middleware, route mounting
│   ├── config/
│   │   ├── db.js                    # MongoDB connection
│   │   └── swagger.js               # Swagger API documentation setup
│   ├── models/
│   │   ├── user.model.js            # User schema (name, email, role, isActive)
│   │   └── transaction.model.js     # Transaction schema with soft delete + indexes
│   ├── controllers/
│   │   ├── auth.controller.js       # Register, login, getMe
│   │   ├── user.controller.js       # Admin user management
│   │   ├── transaction.controller.js# CRUD + filtering + pagination
│   │   └── dashboard.controller.js  # Thin layer — calls dashboard service
│   ├── services/
│   │   └── dashboard.service.js     # All MongoDB aggregation pipelines
│   ├── middleware/
│   │   └── auth.middleware.js       # JWT protect + authorizeRoles guard
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── transaction.routes.js
│   │   └── dashboard.routes.js
│   ├── validators/
│   │   ├── transaction.validator.js # Create and update validation chains
│   │   └── user.validator.js        # Role and status update validation
│   └── utils/
│       ├── errorHandler.js          # AppError class + global error middleware
│       ├── responseFormatter.js     # Consistent sendSuccess() response shape
│       └── jwt.js                   # generateToken and verifyToken helpers
└── test/
    ├── auth.test.js
    ├── dashboard.test.js
    ├── helpers.js
    ├── setup.js
    ├── transaction.test.js
    └── user.test.js
```

---

## Setup & Installation

### Prerequisites

- Node.js v18+
- MongoDB running locally or a MongoDB Atlas URI

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd finance_project

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Fill in MONGO_URI and JWT_SECRET in .env

# 4. Start the development server
npm run dev
```

The server will start on `http://localhost:5000`

Health check: `GET http://localhost:5000/` → `{ success: true, message: "Finance Dashboard API is running" }`

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/finance_dashboard
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
```

---

## Roles & Permissions

The system has three roles with clearly separated access levels:

| Action                        | Viewer | Analyst | Admin |
|-------------------------------|--------|---------|-------|
| View own transactions         | ✅     | ✅      | ✅    |
| View all transactions         | ❌     | ✅      | ✅    |
| Create / Edit / Delete records| ❌     | ❌      | ✅    |
| View dashboard summary        | ✅     | ✅      | ✅    |
| View recent activity          | ✅     | ✅      | ✅    |
| View category breakdown       | ❌     | ✅      | ✅    |
| View monthly / weekly trends  | ❌     | ✅      | ✅    |
| View top categories           | ❌     | ✅      | ✅    |
| Manage users                  | ❌     | ❌      | ✅    |

> **Note:** Self-registration always creates a `viewer` account. Admins promote users via `PATCH /api/users/:id`.

---

## API Reference

All protected routes require the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

All responses follow this shape:
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

---

### Auth

#### Register
```
POST /api/auth/register
```
Creates a new user with the `viewer` role.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "token": "<jwt>",
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "viewer" }
  }
}
```

---

#### Login
```
POST /api/auth/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<jwt>",
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "viewer" }
  }
}
```

---

#### Get Current User
```
GET /api/auth/me
```
🔒 Requires valid JWT.

Returns the profile of the currently logged-in user.

---

### Transactions

#### Get All Transactions
```
GET /api/transactions
```
🔒 All roles. Viewers only see their own transactions.

**Query Parameters:**

| Param       | Type   | Description                          |
|-------------|--------|--------------------------------------|
| type        | string | `income` or `expense`                |
| category    | string | e.g. `food`, `salary`, `rent`        |
| startDate   | date   | ISO 8601 e.g. `2024-01-01`           |
| endDate     | date   | ISO 8601 e.g. `2024-12-31`           |
| minAmount   | number | Minimum transaction amount           |
| maxAmount   | number | Maximum transaction amount           |
| page        | number | Page number (default: 1)             |
| limit       | number | Results per page (default: 10, max: 100) |
| sortBy      | string | Field to sort by (default: `date`)   |
| order       | string | `asc` or `desc` (default: `desc`)    |

**Example:**
```
GET /api/transactions?type=expense&category=food&startDate=2024-01-01&page=1&limit=10
```

---

#### Get Transaction by ID
```
GET /api/transactions/:id
```
🔒 All roles. Viewers are blocked from accessing others' records.

---

#### Create Transaction
```
POST /api/transactions
```
🔒 Admin only.

**Body:**
```json
{
  "amount": 5000,
  "type": "income",
  "category": "salary",
  "date": "2024-06-01",
  "description": "Monthly salary"
}
```

**Valid categories:** `salary`, `freelance`, `investment`, `business`, `food`, `rent`, `utilities`, `transport`, `healthcare`, `education`, `entertainment`, `shopping`, `other`

---

#### Update Transaction
```
PATCH /api/transactions/:id
```
🔒 Admin only. All fields are optional — only provided fields are updated.

---

#### Delete Transaction
```
DELETE /api/transactions/:id
```
🔒 Admin only. Performs a **soft delete** — marks `isDeleted: true` to preserve financial history.

---

### Users

All user management endpoints are **Admin only**.

#### Get All Users
```
GET /api/users
```

**Query Parameters:**

| Param    | Type    | Description                        |
|----------|---------|------------------------------------|
| role     | string  | Filter by `viewer`, `analyst`, `admin` |
| isActive | boolean | Filter by `true` or `false`        |
| search   | string  | Search by name or email            |
| page     | number  | Page number (default: 1)           |
| limit    | number  | Results per page (default: 10)     |

---

#### Get User by ID
```
GET /api/users/:id
```

---

#### Update User Role or Status
```
PATCH /api/users/:id
```

**Body** (at least one field required):
```json
{
  "role": "analyst",
  "isActive": false
}
```

> Admins cannot modify their own role or status.

---

#### Delete User
```
DELETE /api/users/:id
```
Permanently deletes the user and soft-deletes all their transactions.

> Admins cannot delete their own account.

---

#### Get User's Transactions
```
GET /api/users/:id/transactions
```
Returns all transactions belonging to a specific user. Supports `?type=` and pagination.

---

### Dashboard

#### Summary
```
GET /api/dashboard/summary
```
🔒 All roles. Viewers see their own data only.

**Query Parameters:** `startDate`, `endDate`

**Response:**
```json
{
  "data": {
    "summary": {
      "totalIncome": 50000,
      "totalExpenses": 32000,
      "netBalance": 18000,
      "transactionCount": 42
    }
  }
}
```

---

#### Recent Activity
```
GET /api/dashboard/recent
```
🔒 All roles. Viewers see their own recent transactions.

**Query Parameters:** `?limit=5` (default 5, max 20)

---

#### Category Breakdown
```
GET /api/dashboard/categories
```
🔒 Analyst and Admin only.

Returns per-category totals broken down by income and expense, sorted by highest total.

**Query Parameters:** `startDate`, `endDate`

---

#### Monthly Trends
```
GET /api/dashboard/trends/monthly
```
🔒 Analyst and Admin only.

Returns month-by-month income vs expense for the last N months.

**Query Parameters:** `?months=6` (default 6, max 24)

**Response:**
```json
{
  "data": {
    "trends": [
      { "year": 2024, "month": 1, "totalIncome": 50000, "totalExpenses": 32000, "netBalance": 18000, "transactionCount": 12 }
    ]
  }
}
```

---

#### Weekly Trends
```
GET /api/dashboard/trends/weekly
```
🔒 Analyst and Admin only.

Returns a day-by-day breakdown of income and expenses for the last 7 days.

---

#### Top Spending Categories
```
GET /api/dashboard/top-categories
```
🔒 Analyst and Admin only.

Returns the top N expense categories by total amount.

**Query Parameters:** `?limit=5`, `startDate`, `endDate`

---

## Design Decisions

**Service layer for analytics**
All dashboard aggregation logic lives in `dashboard.service.js`, fully separate from HTTP handling. This makes the business logic independently testable and easy to reuse.

**Soft delete for transactions**
Financial records are never hard-deleted. Instead, `isDeleted: true` is set. This preserves audit history and is standard practice in financial systems.

**Password field with `select: false`**
The password hash is excluded from all MongoDB queries by default. It must be explicitly opted into using `.select("+password")`, which only happens during login.

**Role embedded in JWT**
The user's role is stored inside the JWT payload. This allows the `authorizeRoles` middleware to make access decisions without an extra database call on every request.

**Re-fetch user in protect middleware**
Even with a valid token, the `protect` middleware re-fetches the user from the database. This ensures deactivated accounts are rejected even if they hold a non-expired token.

**`buildMatchStage` helper in dashboard service**
All pipelines share a single helper that builds the `$match` stage, including role-scoping and date filtering. This avoids duplication across 6 different aggregations.

**Self-protection guards**
Admins cannot modify or delete their own account. This prevents accidental system lockout.

**Parallel queries with `Promise.all`**
Wherever both a count and a data query are needed for pagination, they run in parallel using `Promise.all` instead of sequentially.

---

## Assumptions

- The first admin user must be created directly in the database or by temporarily allowing admin registration. After that, admins promote other users via the API.
- Soft-deleted transactions are excluded from all queries and analytics automatically via the `isDeleted: false` filter.
- All amounts are stored as plain numbers. No currency conversion is handled — it is assumed all records are in the same currency.
- Date filtering is inclusive on both ends (`$gte` startDate, `$lte` endDate).
- The `viewer` role can see their own transactions and a scoped version of the dashboard summary. They cannot access analytics endpoints.

---

## Error Handling

All errors are handled by a centralized global error middleware in `src/utils/errorHandler.js`.

| Scenario                    | Status Code |
|-----------------------------|-------------|
| Missing or invalid fields   | 400         |
| Invalid MongoDB ObjectId    | 400         |
| Invalid or expired JWT      | 401         |
| Deactivated account         | 403         |
| Insufficient role           | 403         |
| Resource not found          | 404         |
| Duplicate email on register | 409         |
| Unexpected server error     | 500         |

All error responses follow this shape:
```json
{
  "success": false,
  "message": "Descriptive error message here"
}
```

In `development` mode, a `stack` field is also included for easier debugging.
