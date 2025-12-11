import jwt from "jsonwebtoken";

export const auth = (req, res, next) => {
  const authToken = req.headers.authorization; 
  if (!authToken) {
    return res.status(401).json({ message: "Access token required" });
  }

  const token = authToken.split(" ")[1]; 
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
};
