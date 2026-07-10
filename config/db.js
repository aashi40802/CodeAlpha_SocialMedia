const mongoose = require("mongoose");

// Connects to MongoDB using the MONGO_URI from your .env file.
// Called once when the server starts.
async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    // If we can't reach the database there's no point staying up.
    process.exit(1);
  }
}

module.exports = connectDB;
