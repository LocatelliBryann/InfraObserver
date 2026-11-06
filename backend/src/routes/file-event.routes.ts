import { Router } from "express";

import { fileEventController, requireAuth } from "../config/dependencies";
import { authenticateAgent } from "../middlewares/agent-auth.middleware";

const fileEventRouter = Router();

fileEventRouter.get("/", requireAuth, (req, res) => {
  void fileEventController.findRecent(req, res);
});

fileEventRouter.post("/", authenticateAgent, (req, res) => {
  void fileEventController.create(req, res);
});

export default fileEventRouter;