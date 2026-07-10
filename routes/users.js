const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const Follow = require("../models/Follow");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/users/suggestions
// A few users the current user isn't following yet (for the sidebar).
router.get("/suggestions", auth, async (req, res) => {
  try {
    const following = await Follow.find({ follower: req.userId }).distinct(
      "following"
    );
    const exclude = [...following, req.userId];

    const users = await User.find({ _id: { $nin: exclude } }).limit(5);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/users/:username
// Public profile + counts + whether the viewer follows them.
router.get("/:username", auth, async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase(),
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const [followers, following, postCount, viewerFollows] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      Post.countDocuments({ author: user._id }),
      Follow.exists({ follower: req.userId, following: user._id }),
    ]);

    res.json({
      ...user.toObject(),
      followers: followers + (user.baseFollowers || 0),
      following: following + (user.baseFollowing || 0),
      postCount,
      isFollowing: Boolean(viewerFollows),
      isMe: user._id.toString() === req.userId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/users/me
// Update the logged-in user's editable profile fields.
router.put("/me", auth, async (req, res) => {
  try {
    const allowed = ["name", "bio", "avatar", "cover", "location", "website"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/users/:username/follow
router.post("/:username/follow", auth, async (req, res) => {
  try {
    const target = await User.findOne({
      username: req.params.username.toLowerCase(),
    });
    if (!target) return res.status(404).json({ message: "User not found" });

    if (target._id.toString() === req.userId) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    // upsert avoids errors if they double-click.
    await Follow.updateOne(
      { follower: req.userId, following: target._id },
      { $setOnInsert: { follower: req.userId, following: target._id } },
      { upsert: true }
    );

    res.json({ following: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/users/:username/follow
router.delete("/:username/follow", auth, async (req, res) => {
  try {
    const target = await User.findOne({
      username: req.params.username.toLowerCase(),
    });
    if (!target) return res.status(404).json({ message: "User not found" });

    await Follow.deleteOne({ follower: req.userId, following: target._id });
    res.json({ following: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
