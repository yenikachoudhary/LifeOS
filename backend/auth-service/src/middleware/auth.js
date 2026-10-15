import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    req.userId = payload.sub;
    next();
  } catch (err) {
    const message = err.name === "TokenExpiredError" ? "Session expired, please log in again" : "Invalid token";
    res.status(401).json({ message });
  }
}
