import { Router } from "express";

import { authController } from "../controllers/auth.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";

import { loginSchema } from "../validators/auth.schema";

const router = Router();

/**
 * ==========================================
 * Authentication Routes
 * ==========================================
 */

// Connexion
router.post(
  "/login",
  validate(loginSchema),
  authController.login
);

// Profil de l'utilisateur connecté
router.get(
  "/me",
  authMiddleware,
  authController.me
);

export default router;