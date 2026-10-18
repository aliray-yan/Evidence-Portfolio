import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma/client.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  streakCount: true,
  lastActiveAt: true,
  createdAt: true
};

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128)
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128)
});

export const register = asyncHandler(async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (existing) {
    return res.status(409).json({ message: "A user with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      email: req.body.email,
      passwordHash,
      role: "STUDENT"
    },
    select: publicUserSelect
  });

  const token = signToken(user);
  res.status(201).json({ token, user });
});

export const login = asyncHandler(async (req, res) => {
  const userWithPassword = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!userWithPassword) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(req.body.password, userWithPassword.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const today = new Date();
  const lastActive = userWithPassword.lastActiveAt;
  const oneDay = 24 * 60 * 60 * 1000;
  const wasYesterday =
    lastActive &&
    new Date(today.toDateString()).getTime() - new Date(lastActive.toDateString()).getTime() === oneDay;
  const wasToday = lastActive && today.toDateString() === lastActive.toDateString();

  const updated = await prisma.user.update({
    where: { id: userWithPassword.id },
    data: {
      lastActiveAt: today,
      streakCount: wasToday ? userWithPassword.streakCount : wasYesterday ? userWithPassword.streakCount + 1 : 1
    },
    select: publicUserSelect
  });

  const token = signToken(updated);
  res.json({ token, user: updated });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
