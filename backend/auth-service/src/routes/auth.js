import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

const publicUser = (u) => ({ id: u._id.toString(), name: u.name, email: u.email });

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.jwtExpiresIn,
  });

// Precomputed hash so unknown emails take as long as wrong passwords (avoids user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

router.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ message: parsed.error.issues[0].message });
    }
    const { name, email, password } = parsed.data;
    if (await User.exists({ email })) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ message: "Enter a valid email and password" });
    }
    const { email, password } = parsed.data;
    const user = await User.findOne({ email });
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "Account no longer exists" });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
