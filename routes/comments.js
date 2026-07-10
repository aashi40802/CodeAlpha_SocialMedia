const express = require("express");
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const auth = require("../middleware/auth");

const router = express.Router();

// POST /api/comments/:postId  -> add a comment to a post
router.post("/:postId", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment can't be empty" });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = await Comment.create({
      post: post._id,
      author: req.userId,
      text: text.trim(),
    });

    const populated = await comment.populate(
      "author",
      "name username avatar verified"
    );
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/comments/:id  -> delete your own comment
router.delete("/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.author.toString() !== req.userId) {
      return res.status(403).json({ message: "Not your comment" });
    }

    await comment.deleteOne();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
