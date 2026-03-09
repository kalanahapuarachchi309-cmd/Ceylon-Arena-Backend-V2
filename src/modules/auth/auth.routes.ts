import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  changePassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register
} from "./auth.controller";
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema
} from "./auth.validation";

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many auth requests. Please try again later."
  }
});

export const authRoutes = Router();

authRoutes.post("/register", authLimiter, validate(registerSchema), register);
authRoutes.post("/login", authLimiter, validate(loginSchema), login);
authRoutes.post("/refresh", authLimiter, validate(refreshSchema), refresh);
authRoutes.post("/logout", validate(refreshSchema), logout);

authRoutes.get("/me", authenticate, me);
authRoutes.patch("/change-password", authenticate, validate(changePasswordSchema), changePassword);
authRoutes.post("/logout-all", authenticate, logoutAll);
