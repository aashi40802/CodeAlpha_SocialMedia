const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// Helper: sign a JWT for a user id.
function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/register
// Creates an account, hashes the password, returns a token + the user.
router.post("/register", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Make sure username / email aren't already taken.
    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Email or username already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      username,
      email,
      password: hashed,
    });

    const token = signToken(user._id);
    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/login
// Verifies credentials, returns a token + the user.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // password has select:false in the schema, so ask for it explicitly.
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = signToken(user._id);
    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/me
// Returns the currently logged-in user (used to restore a session on refresh).
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
