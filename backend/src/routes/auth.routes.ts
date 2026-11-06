import { Router } from "express";

import {
  authController,
  loginRateLimit,
  requireAuth,
} from "../config/dependencies";
import { requireSameOrigin } from "../middlewares/same-origin.middleware";

const authRouter = Router();

authRouter.post("/login", requireSameOrigin, loginRateLimit, (req, res) => {
  void authController.login(req, res);
});

authRouter.post("/logout", requireSameOrigin, (req, res) => {
  authController.logout(req, res);
});

authRouter.get("/me", requireAuth, (req, res) => {
  authController.me(req, res);
});

export default authRouter;
