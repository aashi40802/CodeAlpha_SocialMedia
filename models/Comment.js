const mongoose = require("mongoose");

// A comment belongs to one post and is written by one user.
const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
