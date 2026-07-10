/* ============================================================
   Vibe — frontend logic (vanilla JS)
   Talks to the Express API on the same origin (/api/...).
   ============================================================ */

const API = "/api";
let token = localStorage.getItem("vibe_token") || null;
let me = JSON.parse(localStorage.getItem("vibe_user") || "null");
let currentFeed = "explore";

// ---------- tiny helpers ----------
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
const esc = (s) =>
  (s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

// Generate a clean avatar locally (no external service): colored circle
// with the person's initials. Deterministic color per username.
const AVATAR_COLORS = [
  "#5b5bd6", "#e5734d", "#2f9e6b", "#c0508f", "#d9a441",
  "#4a7bd0", "#7d5bd6", "#3aa0a0", "#c25b5b", "#6b7280",
];
function initials(name) {
  const parts = (name || "?").trim().split(/\s+/);
  const a = parts[0] ? parts[0][0] : "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}
function avatarFallback(user) {
  const key = (user && (user.username || user.name)) || "?";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const bg = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">` +
    `<rect width="100" height="100" rx="50" fill="${bg}"/>` +
    `<text x="50" y="54" font-family="Inter,Arial,sans-serif" font-size="40" font-weight="600" ` +
    `fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initials(user && user.name)}</text>` +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

// A real photo avatar, consistent per user. Falls back to the initials
// circle automatically if the photo fails to load.
function photoUrl(user) {
  if (user && user.avatar) return user.avatar; // assigned photo
  const key = (user && (user.username || user.name)) || "?";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const n = (hash % 70) + 1; // pravatar has 70 photos
  return `https://i.pravatar.cc/200?img=${n}`;
}

// Returns an <img> avatar tag. cls = extra class, extra = extra attributes.
function avatarTag(user, cls, extra) {
  const fb = photoFallbackNote(user);
  return (
    `<img class="avatar ${cls || ""}" src="${photoUrl(user)}" alt="" ${extra || ""} ` +
    `onerror="this.onerror=null;this.src='${avatarFallback(user)}'">`
  );
}
// (kept simple; no note needed)
function photoFallbackNote() { return ""; }

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return d + "d ago";
  const w = Math.floor(d / 7);
  if (w < 5) return w + "w ago";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2200);
}

// ---------- API wrapper ----------
async function api(path, method = "GET", body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

// ============================================================
//  THEME
// ============================================================
const SUN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
const MOON_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("vibe_theme", theme);
  // show the icon for the theme you'd switch TO
  $("#theme-icon").innerHTML = theme === "dark" ? SUN_ICON : MOON_ICON;
}
applyTheme(localStorage.getItem("vibe_theme") || "light");

// ============================================================
//  AUTH SCREEN
// ============================================================
let authMode = "login";

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll(".auth-tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.mode === mode)
  );
  document.querySelectorAll(".register-only").forEach((f) =>
    f.classList.toggle("hidden", mode !== "register")
  );
  $("#auth-submit").textContent = mode === "login" ? "Log in" : "Create account";
  $("#auth-error").textContent = "";
  $("#auth-hint").classList.toggle("hidden", mode !== "login");
}

document.querySelectorAll(".auth-tab").forEach((t) =>
  t.addEventListener("click", () => setAuthMode(t.dataset.mode))
);

$("#auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = $("#auth-error");
  errBox.textContent = "";
  const submit = $("#auth-submit");
  submit.disabled = true;
  submit.textContent = "Please wait...";

  try {
    let data;
    if (authMode === "register") {
      data = await api("/auth/register", "POST", {
        name: $("#name").value.trim(),
        username: $("#username").value.trim(),
        email: $("#email").value.trim(),
        password: $("#password").value,
      });
    } else {
      data = await api("/auth/login", "POST", {
        email: $("#email").value.trim(),
        password: $("#password").value,
      });
    }
    token = data.token;
    me = data.user;
    localStorage.setItem("vibe_token", token);
    localStorage.setItem("vibe_user", JSON.stringify(me));
    enterApp();
  } catch (err) {
    errBox.textContent = err.message;
  } finally {
    submit.disabled = false;
    submit.textContent = authMode === "login" ? "Log in" : "Create account";
  }
});

// ============================================================
//  APP SHELL
// ============================================================
function enterApp() {
  $("#auth-screen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#me-avatar").innerHTML = avatarTag(me, "");
  $("#composer-avatar").innerHTML = avatarTag(me, "");
  initTopbarIcons();
  showTimeline();
  loadFeed();
  loadSuggestions();
}

function logout() {
  token = null;
  me = null;
  localStorage.removeItem("vibe_token");
  localStorage.removeItem("vibe_user");
  $("#app").classList.add("hidden");
  $("#auth-screen").classList.remove("hidden");
}
$("#logout-btn").addEventListener("click", logout);

$("#theme-toggle").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  applyTheme(cur === "dark" ? "light" : "dark");
});

$("#brand-home").addEventListener("click", () => {
  showTimeline();
  loadFeed();
});
$("#me-avatar").addEventListener("click", () => openProfile(me.username));
$("#profile-back").addEventListener("click", () => {
  showTimeline();
});

function showTimeline() {
  $("#view-timeline").classList.remove("hidden");
  $("#view-profile").classList.add("hidden");
}
function showProfile() {
  $("#view-timeline").classList.add("hidden");
  $("#view-profile").classList.remove("hidden");
}

// ============================================================
//  COMPOSER
// ============================================================
const composerText = $("#composer-text");
composerText.addEventListener("input", () => {
  const len = composerText.value.length;
  $("#char-count").textContent = 500 - len;
  $("#post-btn").disabled = composerText.value.trim().length === 0;
});

$("#post-btn").addEventListener("click", async () => {
  const text = composerText.value.trim();
  if (!text) return;
  $("#post-btn").disabled = true;
  try {
    const post = await api("/posts", "POST", { text });
    composerText.value = "";
    $("#char-count").textContent = 500;
    // show it immediately at the top of the feed
    const feed = $("#feed");
    const card = renderPost(post);
    feed.insertBefore(card, feed.firstChild);
    toast("Posted");
    simulateEngagement(card);
  } catch (err) {
    toast(err.message);
  }
});

// ============================================================
//  FEED
// ============================================================
document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    currentFeed = t.dataset.feed;
    loadFeed();
  })
);

function skeletons(container, n = 4) {
  container.innerHTML = "";
  for (let i = 0; i < n; i++) {
    container.appendChild(
      el("div", "skeleton",
        `<div class="sk-line" style="width:40%"></div>
         <div class="sk-line" style="width:90%"></div>
         <div class="sk-line" style="width:70%"></div>`)
    );
  }
}

async function loadFeed() {
  const feed = $("#feed");
  skeletons(feed);
  try {
    const path = currentFeed === "following" ? "/posts/feed" : "/posts/explore";
    const posts = await api(path);
    // Explore is a "for you" feed, not chronological — shuffle so it feels
    // fresh on every refresh. Following stays in time order.
    if (currentFeed === "explore") {
      for (let i = posts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [posts[i], posts[j]] = [posts[j], posts[i]];
      }
    }
    feed.innerHTML = "";
    if (posts.length === 0) {
      feed.appendChild(
        el("div", "empty",
          currentFeed === "following"
            ? `<h3>Your timeline is quiet</h3><p>Follow a few people and their posts show up here.</p>`
            : `<h3>Nothing here yet</h3><p>Be the first to post something.</p>`)
      );
      return;
    }
    posts.forEach((p) => feed.appendChild(renderPost(p)));
  } catch (err) {
    feed.innerHTML = "";
    feed.appendChild(el("div", "empty", `<h3>Couldn't load posts</h3><p>${esc(err.message)}</p>`));
  }
}

// ============================================================
//  RENDER A POST
// ============================================================
function renderPost(p) {
  const a = p.author || {};
  const card = el("article", "post");
  card.dataset.id = p._id;

  const verified = a.verified ? `<span class="verified" title="Verified">Verified</span>` : "";

  let imagesHtml = "";
  if (p.images && p.images.length) {
    const multi = p.images.length > 1 ? "multi" : "";
    // Fresh random photo each render so the feed doesn't feel static on refresh.
    imagesHtml = `<div class="post-images ${multi}">${p.images
      .map((_, i) => {
        const rnd = Math.random().toString(36).slice(2) + i;
        const src = `https://picsum.photos/900/650?random=${rnd}`;
        return `<img src="${src}" alt="" loading="lazy">`;
      })
      .join("")}</div>`;
  }

  const mine = a._id === me._id;
  const deleteBtn = mine
    ? `<button class="action danger" data-act="delete">Delete</button>`
    : "";

  card.innerHTML = `
    ${p.pinned ? `<div class="pinned-label">Pinned</div>` : ""}
    <div class="post-head">
      ${avatarTag(a, "post-avatar", `data-user="${esc(a.username)}"`)}
      <div class="post-meta">
        <div class="post-name" data-user="${esc(a.username)}">${esc(a.name)} ${verified}</div>
        <div class="post-sub">@${esc(a.username)} &middot; ${timeAgo(p.createdAt)}${p.edited ? " &middot; edited" : ""}</div>
      </div>
    </div>
    ${p.text ? `<div class="post-text">${esc(p.text)}</div>` : ""}
    ${imagesHtml}
    <div class="post-actions">
      <button class="action like-btn ${p.likedByMe ? "liked" : ""}" data-act="like">
        <span class="heart">${p.likedByMe ? "\u2665" : "\u2661"}</span>
        <span class="like-count">${fmt(p.likeCount || 0)}</span>
      </button>
      <button class="action" data-act="comment">
        <span>Reply</span>
        <span class="comment-count">${fmt(p.commentCount || 0)}</span>
      </button>
      ${deleteBtn}
    </div>
    <div class="comments hidden"></div>
  `;

  // avatar / name -> profile
  card.querySelectorAll("[data-user]").forEach((n) =>
    n.addEventListener("click", () => openProfile(n.dataset.user))
  );

  // like
  card.querySelector('[data-act="like"]').addEventListener("click", () => toggleLike(p, card));
  // comment toggle
  card.querySelector('[data-act="comment"]').addEventListener("click", () => toggleComments(p, card));
  // delete
  const del = card.querySelector('[data-act="delete"]');
  if (del) del.addEventListener("click", () => deletePost(p, card));

  return card;
}

// ============================================================
//  LIKE
// ============================================================
async function toggleLike(p, card) {
  const btn = card.querySelector(".like-btn");
  const liked = btn.classList.contains("liked");
  // optimistic UI
  btn.classList.toggle("liked");
  btn.querySelector(".heart").textContent = liked ? "\u2661" : "\u2665";
  try {
    const res = await api(`/posts/${p._id}/like`, liked ? "DELETE" : "POST");
    btn.querySelector(".like-count").textContent = fmt(res.likeCount);
    p.likedByMe = res.likedByMe;
  } catch (err) {
    // revert on failure
    btn.classList.toggle("liked");
    btn.querySelector(".heart").textContent = liked ? "\u2665" : "\u2661";
    toast(err.message);
  }
}

// ============================================================
//  DELETE
// ============================================================
async function deletePost(p, card) {
  if (!confirm("Delete this post? This can't be undone.")) return;
  try {
    await api(`/posts/${p._id}`, "DELETE");
    card.style.opacity = "0";
    setTimeout(() => card.remove(), 200);
    toast("Post deleted");
  } catch (err) {
    toast(err.message);
  }
}

// ============================================================
//  COMMENTS
// ============================================================
async function toggleComments(p, card) {
  const box = card.querySelector(".comments");
  if (!box.classList.contains("hidden")) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  box.innerHTML = `<div class="post-sub">Loading replies...</div>`;
  try {
    const full = await api(`/posts/${p._id}`);
    renderComments(box, full.comments || [], p, card);
  } catch (err) {
    box.innerHTML = `<div class="post-sub">${esc(err.message)}</div>`;
  }
}

function renderComments(box, comments, p, card) {
  box.innerHTML = "";
  comments.forEach((c) => box.appendChild(renderComment(c)));

  const form = el("div", "comment-form");
  const input = el("input");
  input.placeholder = "Write a reply...";
  input.maxLength = 300;
  const send = el("button", "btn btn-primary", "Reply");
  form.appendChild(input);
  form.appendChild(send);
  box.appendChild(form);

  const submit = async () => {
    const text = input.value.trim();
    if (!text) return;
    send.disabled = true;
    try {
      const c = await api(`/comments/${p._id}`, "POST", { text });
      box.insertBefore(renderComment(c), form);
      input.value = "";
      // bump the visible comment count
      const cc = card.querySelector(".comment-count");
      cc.textContent = fmt((parseInt(cc.textContent) || 0) + 1);
    } catch (err) {
      toast(err.message);
    } finally {
      send.disabled = false;
    }
  };
  send.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });
}

function renderComment(c) {
  const a = c.author || {};
  const row = el("div", "comment");
  row.innerHTML = `
    ${avatarTag(a, "comment-avatar")}
    <div>
      <div class="comment-bubble">
        <span class="c-name">${esc(a.name)}</span>
        <span class="post-sub">@${esc(a.username)}</span>
        <div>${esc(c.text)}</div>
      </div>
      <div class="post-sub" style="margin-left:12px;margin-top:2px">${timeAgo(c.createdAt)}</div>
    </div>
  `;
  return row;
}

// ============================================================
//  SUGGESTIONS (who to follow)
// ============================================================
async function loadSuggestions() {
  const box = $("#suggestions");
  box.innerHTML = `<div class="post-sub">Loading...</div>`;
  try {
    const users = await api("/users/suggestions");
    box.innerHTML = "";
    if (!users.length) {
      box.innerHTML = `<div class="post-sub">No suggestions right now.</div>`;
      return;
    }
    users.forEach((u) => box.appendChild(renderSuggestion(u)));
  } catch (err) {
    box.innerHTML = `<div class="post-sub">${esc(err.message)}</div>`;
  }
}

function renderSuggestion(u) {
  const row = el("div", "suggestion");
  row.innerHTML = `
    ${avatarTag(u, "suggestion-avatar", `data-user="${esc(u.username)}"`)}
    <div class="suggestion-info">
      <div class="suggestion-name" data-user="${esc(u.username)}">${esc(u.name)}</div>
      <div class="suggestion-user">@${esc(u.username)}</div>
    </div>
    <button class="btn-follow">Follow</button>
  `;
  row.querySelectorAll("[data-user]").forEach((n) =>
    n.addEventListener("click", () => openProfile(n.dataset.user))
  );
  const btn = row.querySelector(".btn-follow");
  btn.addEventListener("click", async () => {
    const following = btn.classList.contains("following");
    try {
      await api(`/users/${u.username}/follow`, following ? "DELETE" : "POST");
      btn.classList.toggle("following");
      btn.textContent = following ? "Follow" : "Following";
    } catch (err) {
      toast(err.message);
    }
  });
  return row;
}

// ============================================================
//  PROFILE
// ============================================================
async function openProfile(username) {
  showProfile();
  const header = $("#profile-header");
  const feed = $("#profile-feed");
  header.innerHTML = "";
  skeletons(feed, 3);
  window.scrollTo({ top: 0, behavior: "smooth" });

  try {
    const u = await api(`/users/${username}`);
    header.appendChild(renderProfileHeader(u));
    const posts = await api(`/posts/user/${u._id}`);
    feed.innerHTML = "";
    if (!posts.length) {
      feed.appendChild(el("div", "empty", `<h3>No posts yet</h3><p>When ${esc(u.name)} posts, it shows up here.</p>`));
    } else {
      posts.forEach((p) => feed.appendChild(renderPost(p)));
    }
  } catch (err) {
    header.innerHTML = `<div class="empty"><h3>Couldn't load profile</h3><p>${esc(err.message)}</p></div>`;
  }
}

function renderProfileHeader(u) {
  const wrap = el("div");
  const verified = u.verified ? `<span class="verified">Verified</span>` : "";
  const website = u.website
    ? `<span>${esc(u.website)}</span>` : "";
  const location = u.location ? `<span>${esc(u.location)}</span>` : "";
  const joined = `<span>Joined ${new Date(u.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>`;

  const followBtn = u.isMe
    ? ""
    : `<button class="btn-follow ${u.isFollowing ? "following" : ""}">${u.isFollowing ? "Following" : "Follow"}</button>`;

  wrap.innerHTML = `
    <div class="profile-cover" style="background-image:url('${esc(u.cover)}')"></div>
    <div class="profile-body">
      <div class="profile-top">
        ${avatarTag(u, "profile-avatar")}
        ${followBtn}
      </div>
      <div class="profile-name">${esc(u.name)} ${verified}</div>
      <div class="profile-username">@${esc(u.username)}</div>
      ${u.bio ? `<div class="profile-bio">${esc(u.bio)}</div>` : ""}
      <div class="profile-details">${location}${website}${joined}</div>
      <div class="profile-stats">
        <span><b>${fmt(u.following)}</b> Following</span>
        <span><b class="stat-followers">${fmt(u.followers)}</b> Followers</span>
        <span><b>${fmt(u.postCount)}</b> Posts</span>
      </div>
    </div>
  `;

  const fb = wrap.querySelector(".btn-follow");
  if (fb) {
    let followerCount = u.followers;
    fb.addEventListener("click", async () => {
      const following = fb.classList.contains("following");
      try {
        await api(`/users/${u.username}/follow`, following ? "DELETE" : "POST");
        fb.classList.toggle("following");
        fb.textContent = following ? "Follow" : "Following";
        // update the follower number live
        followerCount += following ? -1 : 1;
        const stat = wrap.querySelector(".stat-followers");
        if (stat) stat.textContent = fmt(followerCount);
      } catch (err) {
        toast(err.message);
      }
    });
  }
  return wrap;
}

// ============================================================
//  NOTIFICATIONS + MESSAGES + LIVE ENGAGEMENT
// ============================================================
const BELL_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
const DM_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;

// A few known accounts (with photos) to populate notifications and DMs.
const PEOPLE = {
  ananya: { name: "Ananya Rao", username: "ananyacodes", avatar: "https://randomuser.me/api/portraits/women/65.jpg" },
  marcus: { name: "Marcus Bell", username: "marcusb", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  aisha: { name: "Aisha Khan", username: "aishaeats", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  priya: { name: "Priya", username: "priyawrites", avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
  dev: { name: "Dev Patel", username: "devbuilds", avatar: "https://randomuser.me/api/portraits/men/51.jpg" },
  sofia: { name: "Sofia Martinez", username: "sofiaruns", avatar: "https://randomuser.me/api/portraits/women/12.jpg" },
  rohan: { name: "Rohan Mehra", username: "rohanplays", avatar: "https://randomuser.me/api/portraits/men/22.jpg" },
  kenji: { name: "Kenji Tanaka", username: "kenji", avatar: "https://randomuser.me/api/portraits/men/83.jpg" },
  riya: { name: "Riya", username: "riya_92", avatar: "https://randomuser.me/api/portraits/women/90.jpg" },
};
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const NOTIFICATIONS = [
  { who: PEOPLE.ananya, action: "liked your post", time: "just now", unread: true },
  { who: PEOPLE.priya, action: "started following you", time: "4m ago", unread: true },
  { who: PEOPLE.dev, action: "replied: haha exactly", time: "18m ago", unread: true },
  { who: PEOPLE.sofia, action: "mentioned you in a reply", time: "1h ago", unread: false },
  { who: PEOPLE.rohan, action: "liked your post", time: "2h ago", unread: false },
  { who: PEOPLE.aisha, action: "started following you", time: "yesterday", unread: false },
];

const CONVERSATIONS = [
  { who: PEOPLE.aisha, last: "did you try that place yet?", time: "2m", unread: true,
    thread: [
      { from: "them", text: "did you try that place yet?" },
      { from: "them", text: "the biryani one i posted about" },
    ] },
  { who: PEOPLE.marcus, last: "sending the edits tonight", time: "1h", unread: false,
    thread: [
      { from: "me", text: "how are the photos coming along?" },
      { from: "them", text: "sending the edits tonight" },
    ] },
  { who: PEOPLE.dev, last: "lol the await bug got me too", time: "3h", unread: true,
    thread: [
      { from: "me", text: "spent 3 hours on a missing await today" },
      { from: "them", text: "lol the await bug got me too" },
    ] },
  { who: PEOPLE.priya, last: "chapter 4 finally done", time: "yesterday", unread: false,
    thread: [
      { from: "them", text: "chapter 4 finally done" },
      { from: "me", text: "no way, congrats!!" },
    ] },
];

function renderNotifications() {
  const list = $("#notif-list");
  list.innerHTML = "";
  NOTIFICATIONS.forEach((n) => {
    const row = el("div", "notif-item" + (n.unread ? " unread" : ""));
    row.innerHTML = `
      ${avatarTag(n.who, "notif-avatar", `data-user="${esc(n.who.username)}"`)}
      <div class="notif-body">
        <div><b>${esc(n.who.name)}</b> ${esc(n.action)}</div>
        <div class="post-sub">${esc(n.time)}</div>
      </div>`;
    row.querySelector("[data-user]").addEventListener("click", () => {
      closePanels();
      openProfile(n.who.username);
    });
    list.appendChild(row);
  });
}

function renderConversations() {
  const list = $("#dm-list");
  list.innerHTML = "";
  CONVERSATIONS.forEach((c) => {
    const row = el("div", "dm-item" + (c.unread ? " unread" : ""));
    row.innerHTML = `
      ${avatarTag(c.who, "dm-avatar")}
      <div class="dm-item-body">
        <div class="dm-item-top"><b>${esc(c.who.name)}</b><span class="post-sub">${esc(c.time)}</span></div>
        <div class="dm-last">${esc(c.last)}</div>
      </div>`;
    row.addEventListener("click", () => openThread(c));
    list.appendChild(row);
  });
}

function openThread(c) {
  $("#dm-list").classList.add("hidden");
  const t = $("#dm-thread");
  t.classList.remove("hidden");
  t.innerHTML = `
    <div class="thread-head">
      <button class="back-link" id="thread-back">Back</button>
      <b>${esc(c.who.name)}</b>
    </div>
    <div class="thread-msgs" id="thread-msgs"></div>
    <div class="comment-form">
      <input id="thread-input" placeholder="Message ${esc(c.who.name)}..." />
      <button class="btn btn-primary" id="thread-send">Send</button>
    </div>`;
  const msgs = t.querySelector("#thread-msgs");
  c.thread.forEach((m) => msgs.appendChild(bubble(m.from, m.text)));
  t.querySelector("#thread-back").addEventListener("click", () => {
    t.classList.add("hidden");
    $("#dm-list").classList.remove("hidden");
  });
  const input = t.querySelector("#thread-input");
  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    msgs.appendChild(bubble("me", text));
    input.value = "";
    msgs.scrollTop = msgs.scrollHeight;
    // a little life: they "reply" shortly after
    setTimeout(() => {
      msgs.appendChild(bubble("them", pickRandom(["haha true", "for sure", "lets do it", "omw", "sounds good"])));
      msgs.scrollTop = msgs.scrollHeight;
    }, 1200);
  };
  t.querySelector("#thread-send").addEventListener("click", send);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
  msgs.scrollTop = msgs.scrollHeight;
}

function bubble(from, text) {
  return el("div", "bubble " + from, esc(text));
}

function closePanels() {
  $("#notif-panel").classList.add("hidden");
  $("#dm-panel").classList.add("hidden");
  $("#dm-thread").classList.add("hidden");
  $("#dm-list").classList.remove("hidden");
}
function setBadge(id, n) {
  const b = $(id);
  if (n > 0) { b.textContent = n; b.style.display = "grid"; }
  else b.style.display = "none";
}

let topbarReady = false;
function initTopbarIcons() {
  $("#notif-icon").innerHTML = BELL_ICON;
  $("#dm-icon").innerHTML = DM_ICON;
  setBadge("#notif-badge", NOTIFICATIONS.filter((n) => n.unread).length);
  setBadge("#dm-badge", CONVERSATIONS.filter((c) => c.unread).length);
  renderNotifications();
  renderConversations();
  if (topbarReady) return;
  topbarReady = true;

  $("#notif-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !$("#notif-panel").classList.contains("hidden");
    closePanels();
    if (!open) { $("#notif-panel").classList.remove("hidden"); setBadge("#notif-badge", 0); }
  });
  $("#dm-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !$("#dm-panel").classList.contains("hidden");
    closePanels();
    if (!open) { $("#dm-panel").classList.remove("hidden"); setBadge("#dm-badge", 0); }
  });
  // click outside to close
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".panel") && !e.target.closest(".nav-icon")) closePanels();
  });
}

// When you post, your post picks up a few likes and replies over the next
// few seconds so it feels like people are actually engaging.
function simulateEngagement(card) {
  const likeCountEl = card.querySelector(".like-count");
  const commentCountEl = card.querySelector(".comment-count");
  const box = card.querySelector(".comments");
  let likes = parseInt(likeCountEl.textContent) || 0;

  [[1600, 1], [3400, 2], [5600, 1], [8000, 3]].forEach(([t, n]) => {
    setTimeout(() => { likes += n; likeCountEl.textContent = fmt(likes); }, t);
  });

  const replies = [
    { who: pickRandom(Object.values(PEOPLE)), text: pickRandom(["this is so real", "haha felt this", "okay but same", "needed this today"]) },
    { who: pickRandom(Object.values(PEOPLE)), text: pickRandom(["underrated post", "welcome to vibe", "well said", "big if true"]) },
  ];
  replies.forEach((r, i) => {
    setTimeout(() => {
      box.classList.remove("hidden");
      const c = { author: r.who, text: r.text, createdAt: new Date().toISOString() };
      const form = box.querySelector(".comment-form");
      box.insertBefore(renderComment(c), form || null);
      commentCountEl.textContent = fmt((parseInt(commentCountEl.textContent) || 0) + 1);
    }, 4200 + i * 2600);
  });
}

// ============================================================
//  BOOT
// ============================================================
async function boot() {
  if (token && me) {
    // verify token is still valid
    try {
      await api("/auth/me");
      enterApp();
      return;
    } catch (_) {
      logout();
    }
  }
  setAuthMode("login");
}
boot();
