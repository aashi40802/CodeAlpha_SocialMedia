const mongoose = require("mongoose");

// A registered account. Password is stored hashed (see routes/auth.js).
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false }, // never returned by default
    bio: { type: String, default: "", maxlength: 160 },
    avatar: { type: String, default: "" }, // image URL
    cover: { type: String, default: "" }, // cover image URL
    location: { type: String, default: "" },
    website: { type: String, default: "" },
    verified: { type: Boolean, default: false },
    // Display-only base counts so seeded/notable accounts can show
    // realistic large numbers without creating thousands of real rows.
    baseFollowers: { type: Number, default: 0 },
    baseFollowing: { type: Number, default: 0 },
  },
  { timestamps: true } // adds createdAt (used as "join date") and updatedAt
);

module.exports = mongoose.model("User", userSchema);
