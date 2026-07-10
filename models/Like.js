const mongoose = require("mongoose");

// One row per (user, post) pair. Storing likes as their own collection
// keeps counts fast and makes it impossible to like the same post twice.
const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  { timestamps: true }
);

// A user can only like a given post once.
likeSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model("Like", likeSchema);
