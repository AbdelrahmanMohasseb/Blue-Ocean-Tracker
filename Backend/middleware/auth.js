const jwt = require("jsonwebtoken");
const JWT_SECRET = "blueocean_secret"; 

module.exports = (roles = []) => {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header) return res.status(401).json({ error: "No token" });

      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      req.user = decoded; // { id, role }
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };
};
