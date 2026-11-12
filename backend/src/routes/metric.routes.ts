import { Router } from "express";

import {
  authenticateAgent,
  metricController,
  requireAuth,
} from "../config/dependencies";

const metricRouter = Router();

metricRouter.get("/", requireAuth, (req, res) => {
  void metricController.findRecent(req, res);
});

metricRouter.post("/", authenticateAgent, (req, res) => {
  void metricController.create(req, res);
});

export default metricRouter;