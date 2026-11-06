import { Router } from "express";

import { endpointController, requireAuth } from "../config/dependencies";
import { authenticateAgent } from "../middlewares/agent-auth.middleware";

const endpointRouter = Router();

endpointRouter.get("/", requireAuth, (req, res) => {
  void endpointController.findAll(req, res);
});

endpointRouter.post("/register", authenticateAgent, (req, res) => {
  void endpointController.register(req, res);
});

export default endpointRouter;