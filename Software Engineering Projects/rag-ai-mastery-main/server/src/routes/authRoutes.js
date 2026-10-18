import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { login, loginSchema, me, register, registerSchema } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: config.authRateLimitWindowMs,
  limit: config.authRateLimitMax,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Please wait and try again." }
});

router.post("/register", authLimiter, validateBody(registerSchema), register);
router.post("/login", authLimiter, validateBody(loginSchema), login);
router.get("/me", requireAuth, me);

export default router;
