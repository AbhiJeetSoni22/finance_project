require("dotenv").config();
const mongoose = require("mongoose");

// Use a dedicated test database — never touches your real data
const TEST_DB = process.env.MONGO_URI_TEST || "mongodb://localhost:27017/finance_dashboard_test";

// Connect once before all tests in this suite
beforeAll(async () => {
  await mongoose.connect(TEST_DB);
});

// Clean ALL collections after every test — ensures test isolation
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Disconnect and drop the test DB after all tests are done
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});
