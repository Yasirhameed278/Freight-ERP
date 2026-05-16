require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

(async () => {
  await connectDB();
  const users = await User.find({}, 'firstName lastName email role').lean();
  console.table(users.map(u => ({ name: `${u.firstName} ${u.lastName}`, email: u.email, role: u.role })));
  await mongoose.disconnect();
})();
