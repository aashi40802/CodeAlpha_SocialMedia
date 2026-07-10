const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Follow = require("../models/Follow");
const auth = require("../middleware/auth");

const router = express.Router();

// Given a list of posts, attach likeCount, commentCount, and whether
// the current viewer has liked each one. Done in two grouped queries
// so it stays fast regardless of how many posts we're decorating.
async function decorate(posts, viewerId) {
  if (posts.length === 0) return [];
  const ids = posts.map((p) => p._id);

  const [likeCounts, commentCounts, myLikes] = await Promise.all([
    Like.aggregate([
      { $match: { post: { $in: ids } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]),
    Comment.aggregate([
      { $match: { post: { $in: ids } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]),
    Like.find({ post: { $in: ids }, user: viewerId }).distinct("post"),
  ]);

  const likeMap = Object.fromEntries(likeCounts.map((l) => [l._id.toString(), l.count]));
  const commentMap = Object.fromEntries(
    commentCounts.map((c) => [c._id.toString(), c.count])
  );
  const likedSet = new Set(myLikes.map((id) => id.toString()));

  return posts.map((p) => {
    const obj = p.toObject ? p.toObject() : p;
    const id = obj._id.toString();
    return {
      ...obj,
      likeCount: (likeMap[id] || 0) + (obj.baseLikes || 0),
      commentCount: (commentMap[id] || 0) + (obj.baseComments || 0),
      likedByMe: likedSet.has(id),
    };
  });
}

// GET /api/posts/feed
// Posts from people the viewer follows, plus their own, newest first.
router.get("/feed", auth, async (req, res) => {
  try {
    const following = await Follow.find({ follower: req.userId }).distinct(
      "following"
    );
    const authors = [...following, new mongoose.Types.ObjectId(req.userId)];

    const posts = await Post.find({ author: { $in: authors } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "name username avatar verified");

    res.json(await decorate(posts, req.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/posts/explore
// Newest posts from everyone (for the Explore page / new users).
router.get("/explore", auth, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "name username avatar verified");
    res.json(await decorate(posts, req.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/posts/user/:userId  -> all posts by one user (for their profile)
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .sort({ pinned: -1, createdAt: -1 })
      .populate("author", "name username avatar verified");
    res.json(await decorate(posts, req.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/posts  -> create a post
router.post("/", auth, async (req, res) => {
  try {
    const { text, images } = req.body;
    if ((!text || !text.trim()) && (!images || images.length === 0)) {
      return res.status(400).json({ message: "Post can't be empty" });
    }

    const post = await Post.create({
      author: req.userId,
      text: text || "",
      images: images || [],
      type: images && images.length ? "image" : "text",
    });

    const populated = await post.populate(
      "author",
      "name username avatar verified"
    );
    const [decorated] = await decorate([populated], req.userId);
    res.status(201).json(decorated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/posts/:id  -> one post with its comments
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "author",
      "name username avatar verified"
    );
    if (!post) return res.status(404).json({ message: "Post not found" });

    const [decorated] = await decorate([post], req.userId);
    const comments = await Comment.find({ post: post._id })
      .sort({ createdAt: 1 })
      .populate("author", "name username avatar verified");

    res.json({ ...decorated, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/posts/:id  -> delete your own post (and its comments + likes)
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: "Not your post" });
    }

    await Promise.all([
      Comment.deleteMany({ post: post._id }),
      Like.deleteMany({ post: post._id }),
      post.deleteOne(),
    ]);

    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/posts/:id/like
router.post("/:id/like", auth, async (req, res) => {
  try {
    await Like.updateOne(
      { user: req.userId, post: req.params.id },
      { $setOnInsert: { user: req.userId, post: req.params.id } },
      { upsert: true }
    );
    const post = await Post.findById(req.params.id).select("baseLikes");
    const real = await Like.countDocuments({ post: req.params.id });
    const likeCount = real + ((post && post.baseLikes) || 0);
    res.json({ likedByMe: true, likeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/posts/:id/like
router.delete("/:id/like", auth, async (req, res) => {
  try {
    await Like.deleteOne({ user: req.userId, post: req.params.id });
    const post = await Post.findById(req.params.id).select("baseLikes");
    const real = await Like.countDocuments({ post: req.params.id });
    const likeCount = real + ((post && post.baseLikes) || 0);
    res.json({ likedByMe: false, likeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
