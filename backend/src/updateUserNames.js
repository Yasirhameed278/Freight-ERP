require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

const UPDATES = [
  { email: 'admin@freightpro.ae',   firstName: 'Ali',    lastName: 'Ahmed'   },
  { email: 'manager@freightpro.ae', firstName: 'Sana',   lastName: 'Malik'   },
  { email: 'ops@freightpro.ae',     firstName: 'Usman',  lastName: 'Khan'    },
  { email: 'sales@freightpro.ae',   firstName: 'Fatima', lastName: 'Riaz'    },
  { email: 'finance@freightpro.ae', firstName: 'Hamza',  lastName: 'Sheikh'  },
  { email: 'cs@freightpro.ae',      firstName: 'Ayesha', lastName: 'Qureshi' },
];

(async () => {
  await connectDB();
  for (const { email, firstName, lastName } of UPDATES) {
    const result = await User.updateOne({ email }, { $set: { firstName, lastName } });
    if (result.matchedCount === 0) {
      console.log(`  skipped (not found): ${email}`);
    } else {
      console.log(`  updated: ${email} → ${firstName} ${lastName}`);
    }
  }
  await mongoose.disconnect();
  console.log('Done.');
})();
