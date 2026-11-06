import { Router } from "express";

import { metricController, requireAuth } from "../config/dependencies";
import { authenticateAgent } from "../middlewares/agent-auth.middleware";

const metricRouter = Router();

metricRouter.get("/", requireAuth, (req, res) => {
  void metricController.findRecent(req, res);
});

metricRouter.post("/", authenticateAgent, (req, res) => {
  void metricController.create(req, res);
});

export default metricRouter;