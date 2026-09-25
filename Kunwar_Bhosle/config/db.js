const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gymdb');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('⚠️  AUTHENTICATION FAILED: The database username or password in MONGO_URI is incorrect.');
      console.error('If your password contains special characters (like @, #, $, %), URL-encode them (e.g. @ becomes %40).');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
