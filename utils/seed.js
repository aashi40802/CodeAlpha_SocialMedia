// Seeds the database with realistic-feeling users, posts, comments,
// likes and follows so the app looks like a real community on first run.
//
// Run with:  npm run seed
// WARNING: this wipes existing users/posts/comments/likes/follows first.

require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Follow = require("../models/Follow");

// Illustrated avatars (DiceBear) let us set skin tone per person, so
// Indian accounts read as Indian instead of a random stock photo.
const avatar = (seed, skin) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}` +
  (skin ? `&skinColor=${skin}` : "");
const brandAvatar = (seed) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=5b5bd6`;
// Cover images (Lorem Picsum) skew to landscape/photography, which fits our captions.
const cover = (id) => `https://picsum.photos/seed/${id}/1000/300`;
const photo = (id) => `https://picsum.photos/seed/${id}/900/650`;

const DEMO_PASSWORD = "password123";

// --- Users ---
// Verified accounts are notable: big base follower / following counts.
const users = [
  {
    name: "Ananya Rao", username: "ananyacodes", email: "ananya@vibe.app",
    bio: "software engineer, occasional ceramicist. i write about building things and breaking them.",
    location: "Bengaluru, IN", website: "ananya.dev", verified: true,
    skin: "brown", baseFollowers: 84200, baseFollowing: 312,
  },
  {
    name: "Marcus Bell", username: "marcusb", email: "marcus@vibe.app",
    bio: "photographer. i point cameras at mountains and hope for the best. prints in bio.",
    location: "Denver, CO", website: "marcusbell.photo", verified: true,
    skin: "light", baseFollowers: 128900, baseFollowing: 540,
  },
  {
    name: "The Coffee Journal", username: "coffeejournal", email: "coffee@vibe.app",
    bio: "one cup at a time. reviews, pour-overs, and unnecessarily strong opinions about oat milk.",
    location: "Portland, OR", website: "coffeejournal.co", verified: true,
    brand: true, baseFollowers: 46100, baseFollowing: 88,
  },
  {
    name: "Aisha Khan", username: "aishaeats", email: "aisha@vibe.app",
    bio: "eating my way through the city so you don't have to. home cook. chili flake maximalist.",
    location: "Hyderabad, IN", website: "", verified: true,
    skin: "brown", baseFollowers: 31700, baseFollowing: 903,
  },
  {
    name: "Priya", username: "priyawrites", email: "priya@vibe.app",
    bio: "writing a novel nobody asked for. currently on chapter 3 for 8 months.",
    location: "Mumbai, IN", website: "", verified: false,
    skin: "brown", baseFollowers: 1240, baseFollowing: 340,
  },
  {
    name: "Dev Patel", username: "devbuilds", email: "dev@vibe.app",
    bio: "building things that break. indie hacker. coffee dependent. day 40-something of building in public.",
    location: "Ahmedabad, IN", website: "devbuilds.io", verified: false,
    skin: "brown", baseFollowers: 890, baseFollowing: 610,
  },
  {
    name: "Sofia Martinez", username: "sofiaruns", email: "sofia@vibe.app",
    bio: "marathoner // 5am club // will talk your ear off about splits",
    location: "Barcelona", website: "", verified: false,
    skin: "tanned", baseFollowers: 2410, baseFollowing: 700,
  },
  {
    name: "Rohan Mehra", username: "rohanplays", email: "rohan@vibe.app",
    bio: "gaming, mechanical keyboards, and staying up too late. ranked grind never ends.",
    location: "Pune, IN", website: "", verified: false,
    skin: "brown", baseFollowers: 615, baseFollowing: 520,
  },
  {
    name: "Kenji Tanaka", username: "kenji", email: "kenji@vibe.app",
    bio: "",
    location: "Tokyo", website: "", verified: false,
    skin: "light", baseFollowers: 430, baseFollowing: 210,
  },
  {
    name: "Riya", username: "riya_92", email: "riya@vibe.app",
    bio: "just here to lurk tbh",
    location: "Delhi, IN", website: "", verified: false,
    skin: "brown", baseFollowers: 96, baseFollowing: 480,
  },
];

// authorIndex -> users above. hoursAgo -> timestamp. bl/bc -> base like/comment counts.
// Base engagement scales with how notable the author is.
const posts = [
  { a: 5, h: 0.2, text: "shipped it. it works. i have no idea why it works. going to bed.", bl: 47, bc: 6 },
  { a: 1, h: 0.6, text: "the light this evening was doing something unusual. stood there for twenty minutes just watching.", img: [photo("ridgeline-dusk")], bl: 14200, bc: 421, pinned: true },
  { a: 0, h: 1.2, text: "hot take: most meetings are just standups wearing a trench coat", bl: 8930, bc: 512 },
  { a: 6, h: 2, text: "18k this morning before work. legs are gone. worth it.", bl: 340, bc: 22 },
  { a: 2, h: 2.6, text: "PSA: your espresso isn't bitter because of the beans. it's your grind size. we'll fight about this in the replies.", bl: 6120, bc: 288 },
  { a: 4, h: 4, text: "wrote 200 words today and deleted 400. net progress: negative. the craft is thriving.", bl: 210, bc: 18 },
  { a: 3, h: 5, text: "found a tiny place doing the best biryani i've had in months. no sign, no menu, just a guy and a pot. going back tomorrow.", bl: 9800, bc: 194 },
  { a: 0, h: 7, text: "anyone else feel like they learn a framework right as it becomes irrelevant", bl: 12400, bc: 803 },
  { a: 5, h: 9, text: "day 47 of building in public. revenue: $12. lessons: infinite. still going.", bl: 96, bc: 14 },
  { a: 1, h: 12, text: "took 300 photos today. kept two. that's the job.", img: [photo("coast-morning"), photo("harbor-fog")], bl: 21300, bc: 640 },
  { a: 6, h: 15, text: "reminder that rest days are training too. i'm mostly telling myself this.", bl: 288, bc: 31 },
  { a: 2, h: 18, text: "reviewed a $9 latte today so you don't have to. verdict: it was fine. deeply, expensively fine.", bl: 5400, bc: 210 },
  { a: 4, h: 22, text: "the scariest part of writing isn't the blank page. it's the second draft, where you realize the first one lied to you.", bl: 430, bc: 47 },
  { a: 0, h: 26, text: "finally cleaned up my repo. deleted a file called final_v2_REAL_final.js. we've all been there.", bl: 15600, bc: 921 },
  { a: 8, h: 30, text: "quiet week. good week.", bl: 41, bc: 3 },
  { a: 5, h: 34, text: "if your onboarding has more than 3 steps i'm closing the tab. respectfully.", bl: 74, bc: 9 },
  { a: 1, h: 40, text: "somewhere worth the drive. didn't touch the edit on this one.", img: [photo("mountain-pass")], bl: 18700, bc: 512, pinned: true },
  { a: 6, h: 44, text: "signed up for a full marathon in march. what have i done", bl: 402, bc: 58 },
  { a: 3, h: 50, text: "controversial: a good dal beats most restaurant mains and i will not be softening that.", bl: 11200, bc: 340 },
  { a: 7, h: 55, text: "hit diamond finally. only took losing my entire evening and a piece of my soul.", bl: 190, bc: 24 },
  { a: 0, h: 62, text: "unpopular opinion but tabs. it's tabs. i've made my peace with being wrong about nothing.", bl: 9100, bc: 1204 },
  { a: 2, h: 70, text: "the oat milk discourse in my replies yesterday was the most engaged this account has ever been. never change.", bl: 4300, bc: 176 },
  { a: 9, h: 80, text: "reading everyone's posts and saying nothing. this is my personality now.", bl: 22, bc: 5 },
  { a: 4, h: 90, text: "wrote a sentence today i actually like. keeping it. building a whole chapter around it out of spite.", bl: 260, bc: 33 },
  { a: 1, h: 100, text: "sky did something ridiculous on the way home. pulled over for it.", img: [photo("sky-evening")], bl: 16900, bc: 388 },
  { a: 7, h: 110, text: "new keyboard day. yes it's loud. no i will not be quieter about it.", bl: 260, bc: 41 },
  { a: 3, h: 120, text: "made paneer from scratch for the first time. it worked?? i'm as shocked as you are.", bl: 8700, bc: 220 },
  { a: 5, h: 130, text: "spent 3 hours on a bug that was a missing await. i'm going outside.", bl: 130, bc: 19 },
  { a: 6, h: 140, text: "5am. cold. quiet. nobody else awake. this is the good part nobody tells you about.", bl: 510, bc: 44 },
  { a: 0, h: 160, text: "the best code review i ever got was one word: 'why?'. still think about it.", bl: 13800, bc: 602 },
  { a: 2, h: 180, text: "pour-over of the week: a washed ethiopian that tastes like someone described tea to a robot. i mean that as praise.", bl: 3900, bc: 142 },
  { a: 8, h: 210, text: "ramen weather.", bl: 88, bc: 12 },
  { a: 4, h: 240, text: "eight months on chapter three. at this point the chapter and i are in a relationship.", bl: 380, bc: 52 },
  { a: 1, h: 300, text: "old shot i never posted. still one of my favorites. sometimes they just sit in the archive for a year.", img: [photo("archive-shot")], bl: 24100, bc: 710 },
  { a: 3, h: 360, text: "if you put pineapple near my biryani we are no longer speaking. i don't make the rules.", bl: 10400, bc: 411 },
];

// (postIndex, authorIndex, text) — real conversation, not just praise.
const comments = [
  { p: 0, a: 0, text: "the best deploys are the ones you don't understand. congrats lol" },
  { p: 0, a: 6, text: "sleep is for people whose code works" },
  { p: 2, a: 5, text: "this could've been an email. which could've been a slack. which could've been nothing." },
  { p: 2, a: 8, text: "hard disagree, some standups are load-bearing" },
  { p: 2, a: 0, text: "@kenji name one" },
  { p: 4, a: 7, text: "grind size truthers rise up" },
  { p: 4, a: 5, text: "ok but my machine has one setting and it's 'loud'" },
  { p: 4, a: 3, text: "wrong. it's the water temp. i'll die on this hill next to you though" },
  { p: 6, a: 3, text: "drop the location or we riot" },
  { p: 6, a: 9, text: "saving this immediately" },
  { p: 7, a: 4, text: "felt this in my soul. learned three build tools this year for nothing" },
  { p: 9, a: 2, text: "the second one is unreal. what lens?" },
  { p: 9, a: 1, text: "@coffeejournal 35mm, wide open. thanks!" },
  { p: 12, a: 0, text: "second drafts are where hope goes to get notes" },
  { p: 13, a: 6, text: "final_v2_REAL_final_USE_THIS_ONE.js has entered the chat" },
  { p: 18, a: 3, text: "dal supremacy is just correct, sorry to the haters" },
  { p: 18, a: 9, text: "ok but which dal because that changes everything" },
  { p: 20, a: 5, text: "spaces or we fight" },
  { p: 20, a: 8, text: "this is bait and i'm still replying, well done" },
  { p: 26, a: 4, text: "wait you MADE the paneer? i buy mine and feel accomplished" },
  { p: 34, a: 6, text: "pineapple biryani is a threat to national security" },
  { p: 34, a: 7, text: "this is the most correct thing you've ever posted" },
];

async function run() {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}), Post.deleteMany({}), Comment.deleteMany({}),
    Like.deleteMany({}), Follow.deleteMany({}),
  ]);

  console.log("Creating users...");
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Explicit, gender-correct photo per seeded person.
  const FACES = {
    ananyacodes: ["women", 65], marcusb: ["men", 32], coffeejournal: ["men", 45],
    aishaeats: ["women", 44], priyawrites: ["women", 68], devbuilds: ["men", 51],
    sofiaruns: ["women", 12], rohanplays: ["men", 22], kenji: ["men", 83], riya_92: ["women", 90],
  };
  const faceUrl = (username) => {
    const f = FACES[username];
    return f ? `https://randomuser.me/api/portraits/${f[0]}/${f[1]}.jpg` : "";
  };

  const createdUsers = await User.insertMany(
    users.map((u, i) => ({
      name: u.name, username: u.username, email: u.email, password: hashed,
      bio: u.bio, location: u.location, website: u.website, verified: u.verified,
      baseFollowers: u.baseFollowers, baseFollowing: u.baseFollowing,
      avatar: faceUrl(u.username),
      cover: cover(u.username),
    }))
  );

  console.log("Creating posts...");
  const now = Date.now();
  const createdPosts = [];
  for (const p of posts) {
    const when = new Date(now - p.h * 60 * 60 * 1000);
    const doc = await Post.create({
      author: createdUsers[p.a]._id,
      text: p.text,
      images: p.img || [],
      type: p.img && p.img.length ? "image" : "text",
      baseLikes: p.bl || 0,
      baseComments: p.bc || 0,
      pinned: !!p.pinned,
      createdAt: when, updatedAt: when,
    });
    createdPosts.push(doc);
  }

  console.log("Creating comments...");
  for (const c of comments) {
    await Comment.create({
      post: createdPosts[c.p]._id,
      author: createdUsers[c.a]._id,
      text: c.text,
    });
  }

  console.log("Creating likes...");
  const likeDocs = [];
  createdPosts.forEach((post, idx) => {
    const shuffled = [...createdUsers].sort(() => Math.random() - 0.5);
    const n = 2 + (idx % 6);
    shuffled.slice(0, n).forEach((u) => {
      if (u._id.toString() !== post.author.toString()) {
        likeDocs.push({ user: u._id, post: post._id });
      }
    });
  });
  await Like.insertMany(likeDocs, { ordered: false }).catch(() => {});

  console.log("Creating follows...");
  const followDocs = [];
  createdUsers.forEach((follower, i) => {
    createdUsers.forEach((following, j) => {
      if (i === j) return;
      // everyone follows the verified accounts; plus a pseudo-random spread
      if (following.verified || (i + j) % 3 === 0) {
        followDocs.push({ follower: follower._id, following: following._id });
      }
    });
  });
  await Follow.insertMany(followDocs, { ordered: false }).catch(() => {});

  console.log("\nDone! Seeded:");
  console.log(`  ${createdUsers.length} users`);
  console.log(`  ${createdPosts.length} posts`);
  console.log(`  ${comments.length} comments`);
  console.log(`  ${likeDocs.length} likes`);
  console.log(`  ${followDocs.length} follows`);
  console.log(`\nLog in with any account, e.g.  ananya@vibe.app  /  ${DEMO_PASSWORD}`);

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
