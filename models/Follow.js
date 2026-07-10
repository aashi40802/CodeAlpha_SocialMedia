const mongoose = require("mongoose");

// "follower" follows "following". One row per relationship.
// Powers follower/following counts and the personalized feed.
const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Can't follow the same person twice.
followSchema.index({ follower: 1, following: 1 }, { unique: true });

module.exports = mongoose.model("Follow", followSchema);
