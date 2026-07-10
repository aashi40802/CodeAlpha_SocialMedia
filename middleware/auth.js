const jwt = require("jsonwebtoken");

// Protects routes that require a logged-in user.
// Expects an "Authorization: Bearer <token>" header.
// On success it attaches req.userId and lets the request through.
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token is not valid" });
  }
}

module.exports = auth;
