const mongoose = require("mongoose");

// A post authored by a user. Supports plain text and image posts.
const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, default: "", maxlength: 500 },
    images: [{ type: String }], // array of image URLs (empty for text-only posts)
    type: {
      type: String,
      enum: ["text", "image", "quote"],
      default: "text",
    },
    edited: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    // Display-only base engagement (see User.baseFollowers for the why).
    baseLikes: { type: Number, default: 0 },
    baseComments: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
