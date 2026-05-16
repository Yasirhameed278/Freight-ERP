/**
 * Test database helper.
 * Uses local MongoDB with a dedicated test database (freight_erp_test).
 * No binary download required — uses the same MongoDB as development.
 */
const mongoose = require('mongoose');

const TEST_URI = process.env.MONGO_URI_TEST
  || (process.env.MONGODB_URI || 'mongodb://localhost:27017/freight_erp_test').replace(
      /\/([^/?]+)(\?|$)/,
      '/freight_erp_test$2'
    );

const connect = async () => {
  await mongoose.connect(TEST_URI);
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

const clear = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

module.exports = { connect, disconnect, clear };
