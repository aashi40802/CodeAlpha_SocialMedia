# Vibe — Backend API

Backend for **Vibe**, a full-stack social media platform. Built for CodeAlpha Full Stack Internship — Task 2 (Social Media Platform).

Stack: **Node.js + Express + MongoDB (Mongoose)**, JWT authentication.

This folder is the API server only. The React frontend lives in `../client` (built next).

## What it does

- User registration & login with hashed passwords (bcrypt) and JWT auth
- User profiles with follower / following counts
- Create, read, and delete posts (text + images)
- Comment on posts
- Like / unlike posts
- Follow / unfollow users
- A personalized **feed** (posts from people you follow + your own)
- An **explore** feed (newest posts from everyone)
- A seed script that fills the database with realistic demo users and posts

## Requirements

- Node.js 18+ installed
- A MongoDB database. Easiest option is a free **MongoDB Atlas** cluster
  (https://www.mongodb.com/atlas). A local MongoDB install also works.

## Setup

```bash
# 1. install dependencies
npm install

# 2. create your env file from the template
cp .env.example .env
#    then open .env and set MONGO_URI and JWT_SECRET

# 3. (optional but recommended) fill the database with demo content
npm run seed

# 4. start the server
npm run dev      # auto-restarts on changes (development)
# or
npm start        # plain start
```

Server runs on `http://localhost:5000`. Open it in a browser and you should see
`{ "status": "ok", "message": "Vibe API is running" }`.

## Demo login (after seeding)

Every seeded account uses the password `password123`. For example:

```
email:    ananya@vibe.app
password: password123
```

## API overview

All routes below (except register/login) require an
`Authorization: Bearer <token>` header, where the token comes from register/login.

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, get a token |
| GET | `/api/auth/me` | Get the current logged-in user |

### Users
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/:username` | Get a profile + counts |
| PUT | `/api/users/me` | Update your profile |
| POST | `/api/users/:username/follow` | Follow a user |
| DELETE | `/api/users/:username/follow` | Unfollow a user |
| GET | `/api/users/suggestions` | Suggested users to follow |

### Posts
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/posts/feed` | Feed (people you follow + you) |
| GET | `/api/posts/explore` | Newest posts from everyone |
| GET | `/api/posts/user/:userId` | All posts by one user |
| POST | `/api/posts` | Create a post |
| GET | `/api/posts/:id` | One post + its comments |
| DELETE | `/api/posts/:id` | Delete your own post |
| POST | `/api/posts/:id/like` | Like a post |
| DELETE | `/api/posts/:id/like` | Unlike a post |

### Comments
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/comments/:postId` | Comment on a post |
| DELETE | `/api/comments/:id` | Delete your own comment |

## Project structure

```
server/
├── config/db.js          # MongoDB connection
├── middleware/auth.js     # JWT auth guard
├── models/                # Mongoose schemas
│   ├── User.js
│   ├── Post.js
│   ├── Comment.js
│   ├── Like.js
│   └── Follow.js
├── routes/                # API endpoints
│   ├── auth.js
│   ├── users.js
│   ├── posts.js
│   └── comments.js
├── utils/seed.js          # demo data seeder
├── server.js              # app entry point
└── .env.example           # environment template
```
